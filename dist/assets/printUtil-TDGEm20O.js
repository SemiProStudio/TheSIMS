function r({title:e,styles:o,body:l,delay:n=250}){const t=window.open("","_blank");if(!t)return alert("Pop-up blocked. Please allow pop-ups for this site to print."),null;const i=`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${e}</title>
  <style>${o}</style>
</head>
<body>${l}</body>
</html>`;return t.document.write(i),t.document.close(),setTimeout(()=>t.print(),n),t}export{r as o};
//# sourceMappingURL=printUtil-TDGEm20O.js.map
