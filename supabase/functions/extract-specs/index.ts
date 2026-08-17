// =============================================================================
// Extract Specs Edge Function (Phase 2 of the Smart Paste redesign)
//
// One single, NON-AGENTIC Claude call: page text + the category's canonical
// field schema in, schema-constrained JSON out. No tools, no loops, no
// retries — the model cannot call anything, so a runaway bill is
// structurally impossible. Cost guardrails, in order:
//   1. isTrustedCaller — anonymous internet callers get 401, zero spend
//   2. Input truncated to MAX_INPUT_CHARS before the call
//   3. max_tokens caps the response (thinking + output) at the API level
//   4. 10/minute + 100/day rate limits via the spec_extractions table
//   5. The Anthropic Console monthly spend limit backstops everything
// =============================================================================

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  decodeAuthClaims,
  isTrustedCaller,
} from '../_shared/utils.ts';

const MODEL = 'claude-opus-5';
const MAX_INPUT_CHARS = 30_000; // ~8-10k tokens — caps input cost per call
const MAX_OUTPUT_TOKENS = 3_000; // hard API cap on thinking + response
const PER_MINUTE_LIMIT = 10;
const PER_DAY_LIMIT = 100;

interface SpecDef {
  name: string;
  field_type: string;
  unit: string | null;
  options: string[] | null;
}

function buildSchema(fieldNames: string[]) {
  return {
    type: 'object',
    properties: {
      product_name: { type: ['string', 'null'] },
      brand: { type: ['string', 'null'] },
      specs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', enum: fieldNames },
            value: { type: 'string' },
            quote: { type: 'string' },
          },
          required: ['field', 'value', 'quote'],
          additionalProperties: false,
        },
      },
    },
    required: ['product_name', 'brand', 'specs'],
    additionalProperties: false,
  };
}

function describeFields(defs: SpecDef[]): string {
  return defs
    .map((d) => {
      const parts = [`- ${d.name} (${d.field_type}`];
      if (d.unit) parts.push(`, unit: ${d.unit}`);
      if (d.options?.length) parts.push(`, options: ${d.options.join(' | ')}`);
      parts.push(')');
      return parts.join('');
    })
    .join('\n');
}

const SYSTEM_PROMPT = `You extract product specifications from retailer or manufacturer page text for a film/video gear inventory system.

Rules:
- Extract ONLY the fields listed for this category. Skip any field the text does not clearly state — never guess or infer.
- For every extracted field, include a short verbatim quote (under 120 characters) from the source text showing where the value came from.
- number fields: return a bare number in the field's stated unit, converting when the source uses a different unit (e.g. 695 g -> 24.5 when the unit is oz). One decimal place at most.
- boolean fields: return exactly "Yes" or "No".
- enum fields: return one of the listed options when the source clearly matches one; otherwise return the source's own concise wording.
- text fields: concise value as printed (ranges and compound values are fine).
- Each field appears at most once in the output.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // Guardrail 1: real signed-in users only — the anon key (public, ships
    // in the JS bundle) is rejected, so strangers cannot spend tokens.
    const claims = decodeAuthClaims(req);
    if (!isTrustedCaller(claims)) {
      return errorResponse('Unauthorized', 401);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      // 503 tells the client to fall back to the local parser
      return errorResponse('AI extraction is not configured', 503);
    }

    const { text, category } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return errorResponse('Missing "text"');
    }
    if (!category || typeof category !== 'string') {
      return errorResponse('Missing "category"');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Guardrail 4: burst + daily caps, counted server-side
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const [{ count: perMinute }, { count: perDay }] = await Promise.all([
      supabase
        .from('spec_extractions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', minuteAgo),
      supabase
        .from('spec_extractions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dayAgo),
    ]);
    if ((perMinute ?? 0) >= PER_MINUTE_LIMIT) {
      return errorResponse('Rate limit reached — try again in a minute', 429);
    }
    if ((perDay ?? 0) >= PER_DAY_LIMIT) {
      return errorResponse('Daily AI extraction limit reached — try again tomorrow', 429);
    }

    // The category's canonical typed fields ARE the extraction schema
    const { data: defs, error: defsError } = await supabase
      .from('specs')
      .select('name, field_type, unit, options')
      .eq('category_name', category)
      .order('sort_order');
    if (defsError || !defs?.length) {
      return errorResponse(`No spec fields defined for category "${category}"`, 400);
    }

    // Guardrail 2: input size cap
    const input = text.slice(0, MAX_INPUT_CHARS);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS, // Guardrail 3
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: buildSchema(defs.map((d) => d.name)) },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Category: ${category}\n\nFields to extract:\n${describeFields(defs as SpecDef[])}\n\nPAGE TEXT:\n${input}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return errorResponse('Extraction was declined for this content', 422);
    }
    if (response.stop_reason === 'max_tokens') {
      return errorResponse('Extraction output was truncated — try a shorter page section', 422);
    }

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
    if (!textBlock || !('text' in textBlock)) {
      return errorResponse('No extraction output produced', 500);
    }
    const parsed = JSON.parse((textBlock as { text: string }).text);

    // Usage audit — feeds the rate limits above and cost visibility
    await supabase.from('spec_extractions').insert({
      user_id: claims!.sub ?? null,
      category,
      input_chars: input.length,
      output_tokens: response.usage?.output_tokens ?? null,
    });

    return jsonResponse({
      name: parsed.product_name,
      brand: parsed.brand,
      fields: parsed.specs,
      model: response.model,
      usage: {
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null,
      },
    });
  } catch (err) {
    console.error('extract-specs error:', err);
    return errorResponse('Internal error', 500);
  }
});
