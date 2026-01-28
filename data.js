// ============================================================================
// SIMS Sample Data - Comprehensive inventory with 75+ items
// ============================================================================

import { STATUS, CONDITION } from './constants.js';

// Helper functions for dates
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const daysAgo = (days) => daysFromNow(-days);

// ============================================================================
// INVENTORY DATA
// ============================================================================
export const initialInventory = [
  // === CAMERAS (15) ===
  { id: 'CA1001', name: 'Sony A7S III', brand: 'Sony', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 1', purchaseDate: '2023-06-15', purchasePrice: 3498, currentValue: 2800, serialNumber: 'SN-A7S3-001', image: null,
    specs: { 'Sensor Type': 'Full Frame BSI CMOS', 'Effective Pixels': '12.1MP', 'Video Resolution': '4K 120fps', 'ISO Range': '80-102400', 'Mount Type': 'Sony E-mount' },
    notes: [{ id: 'n1', user: 'Admin', date: daysAgo(30), text: 'Firmware updated to v3.0', replies: [], deleted: false }],
    reservations: [{ id: 'r1', start: daysFromNow(5), end: daysFromNow(7), project: 'Wedding - Smith/Jones', projectType: 'Wedding', user: 'Sarah', contactPhone: '555-111-2222', contactEmail: 'sarah@example.com', location: 'LA Wedding Venue', notes: [] }],
    reminders: [{ id: 'rem1', title: 'Sensor cleaning', description: 'Professional cleaning', dueDate: daysFromNow(0), recurrence: 'quarterly', completed: false, createdAt: daysAgo(90) }],
    maintenanceHistory: [
      { id: 'maint-1', type: 'Cleaning', description: 'Professional sensor cleaning', vendor: 'Camera Service Center', vendorContact: '555-123-4567', cost: 75, scheduledDate: daysAgo(45), completedDate: daysAgo(44), status: 'completed', notes: 'Annual cleaning - sensor was dusty', warrantyWork: false, createdAt: daysAgo(46), updatedAt: daysAgo(44) },
      { id: 'maint-2', type: 'Firmware Update', description: 'Updated to firmware v3.0', vendor: '', vendorContact: '', cost: 0, scheduledDate: daysAgo(30), completedDate: daysAgo(30), status: 'completed', notes: 'Improved autofocus performance', warrantyWork: false, createdAt: daysAgo(31), updatedAt: daysAgo(30) },
      { id: 'maint-3', type: 'Calibration', description: 'Scheduled annual calibration check', vendor: 'Sony Service Center', vendorContact: 'service@sony.com', cost: 0, scheduledDate: daysFromNow(30), completedDate: '', status: 'scheduled', notes: '', warrantyWork: true, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    ],
    viewCount: 45, checkoutCount: 23 },
  
  { id: 'CA1002', name: 'Canon EOS R5', brand: 'Canon', category: 'Cameras', status: STATUS.CHECKED_OUT, checkedOutTo: 'Mike Thompson', checkedOutDate: daysAgo(3), dueBack: daysFromNow(4), condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 1', purchaseDate: '2023-03-20', purchasePrice: 3899, currentValue: 3200, serialNumber: 'SN-R5-002', image: null,
    specs: { 'Sensor Type': 'Full Frame CMOS', 'Effective Pixels': '45MP', 'Video Resolution': '8K 30fps', 'Mount Type': 'Canon RF' },
    notes: [], reservations: [], reminders: [],
    maintenanceHistory: [
      { id: 'maint-4', type: 'Repair', description: 'Shutter mechanism replacement', vendor: 'Canon Authorized Service', vendorContact: '1-800-828-4040', cost: 450, scheduledDate: daysAgo(60), completedDate: daysAgo(52), status: 'completed', notes: 'Shutter count exceeded 300k, replaced under extended warranty', warrantyWork: true, createdAt: daysAgo(65), updatedAt: daysAgo(52) },
    ],
    viewCount: 62, checkoutCount: 31 },
  
  { id: 'CA1003', name: 'Blackmagic URSA Mini Pro 12K', brand: 'Blackmagic Design', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio B - Camera Cage', purchaseDate: '2023-09-10', purchasePrice: 5995, currentValue: 5200, serialNumber: 'SN-URSA12K-003', image: null,
    specs: { 'Sensor Type': 'Super 35 CMOS', 'Effective Pixels': '12288 x 6480', 'Video Resolution': '12K 60fps', 'Mount Type': 'PL/EF', 'Video Format': 'BRAW, ProRes' },
    notes: [], reservations: [{ id: 'r2', start: daysFromNow(10), end: daysFromNow(14), project: 'Documentary - Urban Life', projectType: 'Documentary', user: 'Alex Rivera', contactPhone: '555-222-3333', contactEmail: 'alex@doc.com', location: 'Downtown LA', notes: [] }],
    reminders: [], viewCount: 28, checkoutCount: 8 },
  
  { id: 'CA1004', name: 'Sony FX6', brand: 'Sony', category: 'Cameras', status: STATUS.RESERVED, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 2', purchaseDate: '2023-01-15', purchasePrice: 5998, currentValue: 5000, serialNumber: 'SN-FX6-004', image: null,
    specs: { 'Sensor Type': 'Full Frame BSI CMOS', 'Effective Pixels': '10.2MP', 'Video Resolution': '4K 120fps', 'Mount Type': 'Sony E-mount' },
    notes: [], reservations: [{ id: 'r3', start: daysFromNow(1), end: daysFromNow(3), project: 'Corporate - TechCorp', projectType: 'Corporate', user: 'Jennifer Lee', contactPhone: '555-333-4444', contactEmail: 'jlee@tech.com', location: 'TechCorp HQ', notes: [] }],
    reminders: [], viewCount: 55, checkoutCount: 27 },
  
  { id: 'CA1005', name: 'Canon C70', brand: 'Canon', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Studio A - Shelf 2', purchaseDate: '2022-06-01', purchasePrice: 5499, currentValue: 4200, serialNumber: 'SN-C70-005', image: null,
    specs: { 'Sensor Type': 'Super 35 DGO CMOS', 'Video Resolution': '4K 120fps', 'Mount Type': 'Canon RF' },
    notes: [{ id: 'n2', user: 'Mike', date: daysAgo(60), text: 'Minor LCD scratch - functional', replies: [], deleted: false }],
    reservations: [], reminders: [], viewCount: 38, checkoutCount: 19 },
  
  { id: 'CA1006', name: 'RED Komodo 6K', brand: 'RED', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio B - Camera Cage', purchaseDate: '2023-04-20', purchasePrice: 5999, currentValue: 5200, serialNumber: 'SN-KOMODO-006', image: null,
    specs: { 'Sensor Type': 'Super 35 CMOS', 'Effective Pixels': '19.9MP', 'Video Resolution': '6K 40fps', 'Mount Type': 'Canon RF', 'Video Format': 'REDCODE RAW' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 15 },
  
  { id: 'CA1007', name: 'Panasonic GH6', brand: 'Panasonic', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 3', purchaseDate: '2023-07-10', purchasePrice: 2197, currentValue: 1800, serialNumber: 'SN-GH6-007', image: null,
    specs: { 'Sensor Type': 'Micro Four Thirds', 'Effective Pixels': '25.2MP', 'Video Resolution': '5.7K 60fps', 'Mount Type': 'Micro Four Thirds' },
    notes: [], reservations: [], reminders: [], viewCount: 31, checkoutCount: 12 },
  
  { id: 'CA1008', name: 'Sony A7 IV', brand: 'Sony', category: 'Cameras', status: STATUS.CHECKED_OUT, checkedOutTo: 'David Chen', checkedOutDate: daysAgo(5), dueBack: daysAgo(1), condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 1', purchaseDate: '2023-02-28', purchasePrice: 2498, currentValue: 2200, serialNumber: 'SN-A74-008', image: null,
    specs: { 'Sensor Type': 'Full Frame BSI CMOS', 'Effective Pixels': '33MP', 'Video Resolution': '4K 60fps', 'Mount Type': 'Sony E-mount' },
    notes: [], reservations: [], reminders: [], viewCount: 78, checkoutCount: 42 },
  
  { id: 'CA1009', name: 'Fujifilm X-T5', brand: 'Fujifilm', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 3', purchaseDate: '2023-08-15', purchasePrice: 1699, currentValue: 1500, serialNumber: 'SN-XT5-009', image: null,
    specs: { 'Sensor Type': 'APS-C X-Trans CMOS 5 HR', 'Effective Pixels': '40.2MP', 'Video Resolution': '6.2K 30fps', 'Mount Type': 'Fujifilm X' },
    notes: [], reservations: [], reminders: [], viewCount: 25, checkoutCount: 9 },
  
  { id: 'CA1010', name: 'DJI Ronin 4D-6K', brand: 'DJI', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio B - Gimbal Area', purchaseDate: '2023-05-01', purchasePrice: 7199, currentValue: 6200, serialNumber: 'SN-R4D6K-010', image: null,
    specs: { 'Sensor Type': 'Full Frame CMOS', 'Video Resolution': '6K 60fps', 'Mount Type': 'DL Mount', 'Stabilization': '4-axis Gimbal' },
    notes: [], reservations: [], reminders: [], viewCount: 18, checkoutCount: 5 },
  
  { id: 'CA1011', name: 'Sony A1', brand: 'Sony', category: 'Cameras', status: STATUS.NEEDS_ATTENTION, condition: CONDITION.FAIR, location: 'Repair Shop', purchaseDate: '2022-03-15', purchasePrice: 6498, currentValue: 4800, serialNumber: 'SN-A1-011', image: null,
    specs: { 'Sensor Type': 'Full Frame Stacked CMOS', 'Effective Pixels': '50.1MP', 'Video Resolution': '8K 30fps', 'Mount Type': 'Sony E-mount' },
    notes: [{ id: 'n3', user: 'Admin', date: daysAgo(7), text: 'Sent for shutter replacement - 2 weeks', replies: [], deleted: false }],
    reservations: [], reminders: [{ id: 'rem2', title: 'Check repair status', description: 'Follow up with shop', dueDate: daysFromNow(7), recurrence: 'none', completed: false, createdAt: daysAgo(7) }],
    maintenanceHistory: [
      { id: 'maint-5', type: 'Repair', description: 'Shutter mechanism failure - complete replacement needed', vendor: 'Sony Professional Services', vendorContact: 'pro-support@sony.com', cost: 850, scheduledDate: daysAgo(7), completedDate: '', status: 'in-progress', notes: 'Estimated 2 weeks for parts and repair. High priority.', warrantyWork: false, createdAt: daysAgo(8), updatedAt: daysAgo(7) },
      { id: 'maint-6', type: 'Inspection', description: 'Diagnostic inspection after shutter failure', vendor: 'Sony Professional Services', vendorContact: 'pro-support@sony.com', cost: 0, scheduledDate: daysAgo(10), completedDate: daysAgo(8), status: 'completed', notes: 'Confirmed shutter mechanism needs full replacement. Main board OK.', warrantyWork: false, createdAt: daysAgo(10), updatedAt: daysAgo(8) },
    ],
    viewCount: 52, checkoutCount: 28 },
  
  { id: 'CA1012', name: 'Canon EOS R6 Mark II', brand: 'Canon', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 1', purchaseDate: '2023-11-01', purchasePrice: 2499, currentValue: 2300, serialNumber: 'SN-R6II-012', image: null,
    specs: { 'Sensor Type': 'Full Frame CMOS', 'Effective Pixels': '24.2MP', 'Video Resolution': '4K 60fps', 'Mount Type': 'Canon RF' },
    notes: [], reservations: [], reminders: [], viewCount: 15, checkoutCount: 4 },
  
  { id: 'CA1013', name: 'Blackmagic Pocket 6K Pro', brand: 'Blackmagic Design', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Studio B - Camera Cage', purchaseDate: '2022-08-20', purchasePrice: 2495, currentValue: 1900, serialNumber: 'SN-BP6KP-013', image: null,
    specs: { 'Sensor Type': 'Super 35 CMOS', 'Video Resolution': '6K 50fps', 'Mount Type': 'Canon EF', 'Video Format': 'BRAW, ProRes' },
    notes: [], reservations: [{ id: 'r4', start: daysFromNow(15), end: daysFromNow(18), project: 'Music Video - The Waves', projectType: 'Music Video', user: 'Chris Martinez', contactPhone: '555-444-5555', contactEmail: 'chris@music.com', location: 'Sunset Studios', notes: [] }],
    reminders: [], viewCount: 44, checkoutCount: 22 },
  
  { id: 'CA1014', name: 'Sony ZV-E1', brand: 'Sony', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Shelf 3', purchaseDate: '2024-01-05', purchasePrice: 2198, currentValue: 2100, serialNumber: 'SN-ZVE1-014', image: null,
    specs: { 'Sensor Type': 'Full Frame CMOS', 'Effective Pixels': '12.1MP', 'Video Resolution': '4K 60fps', 'Mount Type': 'Sony E-mount' },
    notes: [], reservations: [], reminders: [], viewCount: 8, checkoutCount: 2 },
  
  { id: 'CA1015', name: 'GoPro Hero 12', brand: 'GoPro', category: 'Cameras', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet', purchaseDate: '2023-10-15', purchasePrice: 449, currentValue: 380, serialNumber: 'SN-GPH12-015', image: null,
    specs: { 'Sensor Type': '1/1.9" CMOS', 'Effective Pixels': '27MP', 'Video Resolution': '5.3K 60fps', 'Stabilization': 'HyperSmooth 6.0' },
    notes: [], reservations: [], reminders: [], viewCount: 35, checkoutCount: 18 },

  // === LENSES (15) ===
  { id: 'LE1001', name: 'Sony 24-70mm f/2.8 GM II', brand: 'Sony', category: 'Lenses', status: STATUS.CHECKED_OUT, checkedOutTo: 'Mike Thompson', checkedOutDate: daysAgo(3), dueBack: daysFromNow(4), condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-04-10', purchasePrice: 2298, currentValue: 2000, serialNumber: 'SN-2470GM-001', image: null,
    specs: { 'Focal Length': '24-70mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '82mm' },
    notes: [], reservations: [], reminders: [], viewCount: 89, checkoutCount: 45 },
  
  { id: 'LE1002', name: 'Canon RF 70-200mm f/2.8L IS USM', brand: 'Canon', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-02-15', purchasePrice: 2699, currentValue: 2400, serialNumber: 'SN-70200RF-002', image: null,
    specs: { 'Focal Length': '70-200mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Canon RF', 'Image Stabilization': '5-stop IS' },
    notes: [], reservations: [], reminders: [], viewCount: 72, checkoutCount: 38 },
  
  { id: 'LE1003', name: 'Sony 50mm f/1.2 GM', brand: 'Sony', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-06-20', purchasePrice: 1998, currentValue: 1800, serialNumber: 'SN-50GM-003', image: null,
    specs: { 'Focal Length': '50mm', 'Maximum Aperture': 'f/1.2', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '72mm' },
    notes: [], reservations: [], reminders: [], viewCount: 56, checkoutCount: 28 },
  
  { id: 'LE1004', name: 'Canon RF 15-35mm f/2.8L IS USM', brand: 'Canon', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-03-05', purchasePrice: 2399, currentValue: 2100, serialNumber: 'SN-1535RF-004', image: null,
    specs: { 'Focal Length': '15-35mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Canon RF', 'Image Stabilization': '5-stop IS' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 22 },
  
  { id: 'LE1005', name: 'Sigma 35mm f/1.4 DG DN Art', brand: 'Sigma', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-01-20', purchasePrice: 899, currentValue: 750, serialNumber: 'SN-35ART-005', image: null,
    specs: { 'Focal Length': '35mm', 'Maximum Aperture': 'f/1.4', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '67mm' },
    notes: [], reservations: [], reminders: [], viewCount: 62, checkoutCount: 31 },
  
  { id: 'LE1006', name: 'Sony 85mm f/1.4 GM', brand: 'Sony', category: 'Lenses', status: STATUS.RESERVED, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2022-11-10', purchasePrice: 1798, currentValue: 1500, serialNumber: 'SN-85GM-006', image: null,
    specs: { 'Focal Length': '85mm', 'Maximum Aperture': 'f/1.4', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '77mm' },
    notes: [], reservations: [{ id: 'r5', start: daysFromNow(2), end: daysFromNow(4), project: 'Portrait - Magazine', projectType: 'Portrait', user: 'Emma Wilson', contactPhone: '555-555-6666', contactEmail: 'emma@mag.com', location: 'Studio A', notes: [] }],
    reminders: [], viewCount: 71, checkoutCount: 35 },
  
  { id: 'LE1007', name: 'Canon RF 100-500mm f/4.5-7.1L IS USM', brand: 'Canon', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Studio A - Lens Cabinet', purchaseDate: '2022-09-15', purchasePrice: 2699, currentValue: 2200, serialNumber: 'SN-100500RF-007', image: null,
    specs: { 'Focal Length': '100-500mm', 'Maximum Aperture': 'f/4.5-7.1', 'Lens Mount': 'Canon RF', 'Image Stabilization': '6-stop IS' },
    notes: [], reservations: [], reminders: [], viewCount: 28, checkoutCount: 11 },
  
  { id: 'LE1008', name: 'Sony 16-35mm f/2.8 GM', brand: 'Sony', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-05-25', purchasePrice: 2198, currentValue: 1900, serialNumber: 'SN-1635GM-008', image: null,
    specs: { 'Focal Length': '16-35mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '82mm' },
    notes: [], reservations: [], reminders: [], viewCount: 54, checkoutCount: 26 },
  
  { id: 'LE1009', name: 'Sigma 24-70mm f/2.8 DG DN Art', brand: 'Sigma', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-07-30', purchasePrice: 1099, currentValue: 950, serialNumber: 'SN-2470SIG-009', image: null,
    specs: { 'Focal Length': '24-70mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '82mm' },
    notes: [], reservations: [], reminders: [], viewCount: 41, checkoutCount: 19 },
  
  { id: 'LE1010', name: 'Canon EF 24-70mm f/2.8L II USM', brand: 'Canon', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Studio B - Lens Cabinet', purchaseDate: '2020-05-15', purchasePrice: 1899, currentValue: 1200, serialNumber: 'SN-2470EF-010', image: null,
    specs: { 'Focal Length': '24-70mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Canon EF', 'Filter Thread': '82mm' },
    notes: [], reservations: [], reminders: [], viewCount: 88, checkoutCount: 52 },
  
  { id: 'LE1011', name: 'Sony 70-200mm f/2.8 GM OSS II', brand: 'Sony', category: 'Lenses', status: STATUS.CHECKED_OUT, checkedOutTo: 'Sarah Kim', checkedOutDate: daysAgo(2), dueBack: daysFromNow(5), condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-09-20', purchasePrice: 2798, currentValue: 2600, serialNumber: 'SN-70200GM2-011', image: null,
    specs: { 'Focal Length': '70-200mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Sony E-mount', 'Image Stabilization': 'OSS 5.5 stops' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 18 },
  
  { id: 'LE1012', name: 'Zeiss Batis 25mm f/2', brand: 'Zeiss', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2022-04-10', purchasePrice: 1299, currentValue: 950, serialNumber: 'SN-BATIS25-012', image: null,
    specs: { 'Focal Length': '25mm', 'Maximum Aperture': 'f/2', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '67mm' },
    notes: [], reservations: [], reminders: [], viewCount: 32, checkoutCount: 14 },
  
  { id: 'LE1013', name: 'Canon RF 50mm f/1.2L USM', brand: 'Canon', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-08-05', purchasePrice: 2299, currentValue: 2100, serialNumber: 'SN-50RF-013', image: null,
    specs: { 'Focal Length': '50mm', 'Maximum Aperture': 'f/1.2', 'Lens Mount': 'Canon RF', 'Filter Thread': '77mm' },
    notes: [], reservations: [], reminders: [], viewCount: 38, checkoutCount: 16 },
  
  { id: 'LE1014', name: 'Tamron 28-75mm f/2.8 Di III VXD G2', brand: 'Tamron', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2023-10-01', purchasePrice: 899, currentValue: 820, serialNumber: 'SN-2875TAM-014', image: null,
    specs: { 'Focal Length': '28-75mm', 'Maximum Aperture': 'f/2.8', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '67mm' },
    notes: [], reservations: [], reminders: [], viewCount: 28, checkoutCount: 11 },
  
  { id: 'LE1015', name: 'Sony 135mm f/1.8 GM', brand: 'Sony', category: 'Lenses', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Studio A - Lens Cabinet', purchaseDate: '2022-12-15', purchasePrice: 1898, currentValue: 1600, serialNumber: 'SN-135GM-015', image: null,
    specs: { 'Focal Length': '135mm', 'Maximum Aperture': 'f/1.8', 'Lens Mount': 'Sony E-mount', 'Filter Thread': '82mm' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 19 },

  // === LIGHTING (12) ===
  { id: 'LI1001', name: 'Aputure 600d Pro', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack A', purchaseDate: '2023-03-10', purchasePrice: 1699, currentValue: 1400, serialNumber: 'SN-600D-001', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '600W', 'Color Temperature': '5600K', 'CRI': '96+', 'Control Method': 'Sidus Link, DMX' },
    notes: [], reservations: [], reminders: [], viewCount: 65, checkoutCount: 32 },
  
  { id: 'LI1002', name: 'Aputure 300d II', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Lighting Storage - Rack A', purchaseDate: '2022-01-20', purchasePrice: 1099, currentValue: 750, serialNumber: 'SN-300D-002', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '300W', 'Color Temperature': '5500K', 'CRI': '96+' },
    notes: [], reservations: [], reminders: [], viewCount: 78, checkoutCount: 45 },
  
  { id: 'LI1003', name: 'Aputure 300d II', brand: 'Aputure', category: 'Lighting', status: STATUS.CHECKED_OUT, checkedOutTo: 'Production Team A', checkedOutDate: daysAgo(1), dueBack: daysFromNow(6), condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack A', purchaseDate: '2023-01-15', purchasePrice: 1099, currentValue: 900, serialNumber: 'SN-300D-003', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '300W', 'Color Temperature': '5500K', 'CRI': '96+' },
    notes: [], reservations: [], reminders: [], viewCount: 52, checkoutCount: 28 },
  
  { id: 'LI1004', name: 'Aputure Nova P300c', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack B', purchaseDate: '2023-06-05', purchasePrice: 1299, currentValue: 1100, serialNumber: 'SN-P300C-004', image: null,
    specs: { 'Light Type': 'LED Panel (RGBWW)', 'Max Power Output': '300W', 'Color Temperature': '2000K-10000K', 'CRI': '95+', 'RGB/HSI': 'Full RGB' },
    notes: [], reservations: [], reminders: [], viewCount: 38, checkoutCount: 18 },
  
  { id: 'LI1005', name: 'Godox VL300', brand: 'Godox', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack A', purchaseDate: '2023-04-20', purchasePrice: 599, currentValue: 500, serialNumber: 'SN-VL300-005', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '300W', 'Color Temperature': '5600K', 'CRI': '96' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 24 },
  
  { id: 'LI1006', name: 'Aputure MC Pro (4-Light Kit)', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Shelf C', purchaseDate: '2023-09-10', purchasePrice: 1196, currentValue: 1050, serialNumber: 'SN-MCPRO-006', image: null,
    specs: { 'Light Type': 'LED Panel (RGBWW)', 'Max Power Output': '10W each', 'Color Temperature': '2000K-10000K', 'Battery Life': '2+ hours' },
    notes: [], reservations: [], reminders: [], viewCount: 32, checkoutCount: 15 },
  
  { id: 'LI1007', name: 'Nanlite Forza 500', brand: 'Nanlite', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack A', purchaseDate: '2023-02-28', purchasePrice: 849, currentValue: 700, serialNumber: 'SN-FORZA500-007', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '500W', 'Color Temperature': '5600K', 'CRI': '98' },
    notes: [], reservations: [], reminders: [], viewCount: 41, checkoutCount: 19 },
  
  { id: 'LI1008', name: 'Light Dome II (150)', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Modifier Shelf', purchaseDate: '2023-03-15', purchasePrice: 299, currentValue: 250, serialNumber: 'SN-DOME2-008', image: null,
    specs: { 'Light Type': 'Softbox', 'Dimensions': '150cm diameter', 'Modifier Mount': 'Bowens' },
    notes: [], reservations: [], reminders: [], viewCount: 55, checkoutCount: 30 },
  
  { id: 'LI1009', name: 'Aputure Lantern 90', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Lighting Storage - Modifier Shelf', purchaseDate: '2022-08-10', purchasePrice: 149, currentValue: 100, serialNumber: 'SN-LANT90-009', image: null,
    specs: { 'Light Type': 'China Ball Softbox', 'Dimensions': '90cm diameter', 'Beam Angle': '270° coverage' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 28 },
  
  { id: 'LI1010', name: 'Astera Titan Tube (8-Pack)', brand: 'Astera', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack B', purchaseDate: '2023-07-20', purchasePrice: 7600, currentValue: 6800, serialNumber: 'SN-TITAN8-010', image: null,
    specs: { 'Light Type': 'LED Tube (RGBMA)', 'Max Power Output': '72W each', 'Color Temperature': '1750K-20000K', 'CRI': '96+', 'Battery Life': '20+ hours' },
    notes: [], reservations: [], reminders: [{ id: 'rem3', title: 'Battery cycle', description: 'Full discharge/charge cycle', dueDate: daysFromNow(14), recurrence: 'monthly', completed: false, createdAt: daysAgo(16) }],
    viewCount: 28, checkoutCount: 12 },
  
  { id: 'LI1011', name: 'Profoto B10 Plus (2-Light Kit)', brand: 'Profoto', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack C', purchaseDate: '2023-05-15', purchasePrice: 4398, currentValue: 3800, serialNumber: 'SN-B10PLUS-011', image: null,
    specs: { 'Light Type': 'Strobe', 'Max Power Output': '500Ws', 'Color Temperature': '5600K', 'Strobe/Effects': 'TTL, HSS 1/8000s' },
    notes: [], reservations: [], reminders: [], viewCount: 35, checkoutCount: 14 },
  
  { id: 'LI1012', name: 'Aputure amaran 200d', brand: 'Aputure', category: 'Lighting', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Lighting Storage - Rack A', purchaseDate: '2023-11-05', purchasePrice: 349, currentValue: 320, serialNumber: 'SN-AM200D-012', image: null,
    specs: { 'Light Type': 'LED COB', 'Max Power Output': '200W', 'Color Temperature': '5600K', 'CRI': '95+' },
    notes: [], reservations: [], reminders: [], viewCount: 18, checkoutCount: 6 },

  // === AUDIO (10) ===
  { id: 'AU1001', name: 'Sennheiser MKH 416', brand: 'Sennheiser', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf A', purchaseDate: '2022-06-15', purchasePrice: 999, currentValue: 850, serialNumber: 'SN-MKH416-001', image: null,
    specs: { 'Microphone Type': 'Shotgun', 'Polar Pattern': 'Super-cardioid/Lobar', 'Frequency Response': '40Hz - 20kHz', 'Output Connector': 'XLR-3' },
    notes: [], reservations: [], reminders: [], viewCount: 72, checkoutCount: 38 },
  
  { id: 'AU1002', name: 'Rode NTG5', brand: 'Rode', category: 'Audio', status: STATUS.CHECKED_OUT, checkedOutTo: 'Sound Dept', checkedOutDate: daysAgo(2), dueBack: daysFromNow(5), condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf A', purchaseDate: '2023-02-10', purchasePrice: 499, currentValue: 420, serialNumber: 'SN-NTG5-002', image: null,
    specs: { 'Microphone Type': 'Shotgun', 'Polar Pattern': 'Super-cardioid', 'Self-Noise': '10 dB-A', 'Output Connector': 'XLR' },
    notes: [], reservations: [], reminders: [], viewCount: 58, checkoutCount: 31 },
  
  { id: 'AU1003', name: 'Sennheiser EW 112P G4 Lav Kit', brand: 'Sennheiser', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf B', purchaseDate: '2023-04-05', purchasePrice: 599, currentValue: 520, serialNumber: 'SN-EW112-003', image: null,
    specs: { 'Microphone Type': 'Lavalier (Wireless)', 'Polar Pattern': 'Omnidirectional', 'Wireless Range': '100m', 'Battery Life': '8 hours' },
    notes: [], reservations: [], reminders: [{ id: 'rem4', title: 'Battery replacement', description: 'Replace wireless kit batteries', dueDate: daysFromNow(7), recurrence: 'monthly', completed: false, createdAt: daysAgo(23) }],
    viewCount: 65, checkoutCount: 35 },
  
  { id: 'AU1004', name: 'Sennheiser EW 112P G4 Lav Kit', brand: 'Sennheiser', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf B', purchaseDate: '2023-04-05', purchasePrice: 599, currentValue: 520, serialNumber: 'SN-EW112-004', image: null,
    specs: { 'Microphone Type': 'Lavalier (Wireless)', 'Polar Pattern': 'Omnidirectional', 'Wireless Range': '100m', 'Battery Life': '8 hours' },
    notes: [], reservations: [], reminders: [], viewCount: 62, checkoutCount: 33 },
  
  { id: 'AU1005', name: 'Zoom F8n Pro', brand: 'Zoom', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf C', purchaseDate: '2023-01-20', purchasePrice: 1499, currentValue: 1300, serialNumber: 'SN-F8NPRO-005', image: null,
    specs: { 'Microphone Type': 'Field Recorder', 'Channels': '8 inputs / 10 tracks', 'Bit Depth/Sample Rate': '32-bit float / 192kHz' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 18 },
  
  { id: 'AU1006', name: 'Sound Devices MixPre-6 II', brand: 'Sound Devices', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf C', purchaseDate: '2022-11-15', purchasePrice: 899, currentValue: 750, serialNumber: 'SN-MIXPRE6-006', image: null,
    specs: { 'Microphone Type': 'Field Recorder/Mixer', 'Channels': '6 inputs / 8 tracks', 'Bit Depth/Sample Rate': '32-bit float / 192kHz' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 22 },
  
  { id: 'AU1007', name: 'DJI Mic (2-Person Kit)', brand: 'DJI', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf B', purchaseDate: '2023-08-20', purchasePrice: 329, currentValue: 290, serialNumber: 'SN-DJIMIC-007', image: null,
    specs: { 'Microphone Type': 'Wireless System', 'Wireless Range': '250m outdoor', 'Battery Life': '5.5 hours', 'Channels': '2' },
    notes: [], reservations: [], reminders: [], viewCount: 55, checkoutCount: 28 },
  
  { id: 'AU1008', name: 'Rode Wireless Go II', brand: 'Rode', category: 'Audio', status: STATUS.RESERVED, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf B', purchaseDate: '2023-03-10', purchasePrice: 299, currentValue: 260, serialNumber: 'SN-WLSGO2-008', image: null,
    specs: { 'Microphone Type': 'Wireless System', 'Wireless Range': '200m', 'Battery Life': '7 hours', 'On-board Recording': '40+ hours' },
    notes: [], reservations: [{ id: 'r6', start: daysFromNow(1), end: daysFromNow(2), project: 'Interview - Tech Leader', projectType: 'Corporate', user: 'Lisa Park', contactPhone: '555-666-7777', contactEmail: 'lisa@corp.com', location: 'Downtown Office', notes: [] }],
    reminders: [], viewCount: 68, checkoutCount: 42 },
  
  { id: 'AU1009', name: 'Boom Pole - K-Tek KE-110CCR', brand: 'K-Tek', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Rack', purchaseDate: '2022-09-05', purchasePrice: 389, currentValue: 320, serialNumber: 'SN-KTEK110-009', image: null,
    specs: { 'Microphone Type': 'Boom Pole', 'Length': '3.3m extended', 'Material': 'Carbon Fiber', 'Cable': 'Internal coiled' },
    notes: [], reservations: [], reminders: [], viewCount: 35, checkoutCount: 20 },
  
  { id: 'AU1010', name: 'Deity S-Mic 2S', brand: 'Deity', category: 'Audio', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Audio Cabinet - Shelf A', purchaseDate: '2023-10-10', purchasePrice: 349, currentValue: 320, serialNumber: 'SN-SMIC2S-010', image: null,
    specs: { 'Microphone Type': 'Shotgun', 'Polar Pattern': 'Super-cardioid', 'Self-Noise': '12 dB-A', 'Output Connector': 'XLR' },
    notes: [], reservations: [], reminders: [], viewCount: 22, checkoutCount: 9 },

  // === SUPPORT (8) ===
  { id: 'SU1001', name: 'Sachtler Video 18 S2 Fluid Head', brand: 'Sachtler', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Support Equipment - Bay 1', purchaseDate: '2022-05-15', purchasePrice: 4200, currentValue: 3500, serialNumber: 'SN-V18S2-001', image: null,
    specs: { 'Support Type': 'Fluid Head', 'Max Payload': '18kg', 'Counterbalance': '16 steps', 'Bowl Size': '100mm' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 22 },
  
  { id: 'SU1002', name: 'Sachtler flowtech 100 Tripod', brand: 'Sachtler', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Support Equipment - Bay 1', purchaseDate: '2022-05-15', purchasePrice: 2150, currentValue: 1800, serialNumber: 'SN-FT100-002', image: null,
    specs: { 'Support Type': 'Tripod Legs', 'Max Payload': '30kg', 'Max Height': '157cm', 'Material': 'Carbon Fiber' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 21 },
  
  { id: 'SU1003', name: 'DJI RS 3 Pro', brand: 'DJI', category: 'Support', status: STATUS.CHECKED_OUT, checkedOutTo: 'Camera Dept', checkedOutDate: daysAgo(1), dueBack: daysFromNow(4), condition: CONDITION.EXCELLENT, location: 'Support Equipment - Gimbal Shelf', purchaseDate: '2023-06-20', purchasePrice: 1099, currentValue: 950, serialNumber: 'SN-RS3PRO-003', image: null,
    specs: { 'Support Type': '3-Axis Gimbal', 'Max Payload': '4.5kg', 'Battery Life': '12 hours' },
    notes: [], reservations: [], reminders: [], viewCount: 58, checkoutCount: 32 },
  
  { id: 'SU1004', name: 'Manfrotto 504X Fluid Head', brand: 'Manfrotto', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Support Equipment - Bay 2', purchaseDate: '2021-08-10', purchasePrice: 849, currentValue: 550, serialNumber: 'SN-504X-004', image: null,
    specs: { 'Support Type': 'Fluid Head', 'Max Payload': '12kg', 'Counterbalance': '4 steps', 'Bowl Size': '75mm' },
    notes: [], reservations: [], reminders: [], viewCount: 38, checkoutCount: 22 },
  
  { id: 'SU1005', name: 'Manfrotto 645 Fast Twin Tripod', brand: 'Manfrotto', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Support Equipment - Bay 2', purchaseDate: '2023-03-25', purchasePrice: 699, currentValue: 600, serialNumber: 'SN-645FT-005', image: null,
    specs: { 'Support Type': 'Tripod Legs', 'Max Payload': '25kg', 'Max Height': '170cm', 'Material': 'Carbon Fiber' },
    notes: [], reservations: [], reminders: [], viewCount: 32, checkoutCount: 15 },
  
  { id: 'SU1006', name: 'Edelkrone SliderPLUS v5 Long', brand: 'Edelkrone', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Support Equipment - Slider Shelf', purchaseDate: '2023-04-10', purchasePrice: 899, currentValue: 780, serialNumber: 'SN-SLPLUS-006', image: null,
    specs: { 'Support Type': 'Camera Slider', 'Max Payload': '18kg', 'Travel Length': '85cm' },
    notes: [], reservations: [], reminders: [], viewCount: 28, checkoutCount: 14 },
  
  { id: 'SU1007', name: 'Zhiyun Crane 4', brand: 'Zhiyun', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Support Equipment - Gimbal Shelf', purchaseDate: '2023-09-15', purchasePrice: 749, currentValue: 680, serialNumber: 'SN-CRANE4-007', image: null,
    specs: { 'Support Type': '3-Axis Gimbal', 'Max Payload': '6kg', 'Battery Life': '14 hours' },
    notes: [], reservations: [], reminders: [], viewCount: 22, checkoutCount: 8 },
  
  { id: 'SU1008', name: 'PROAIM 12ft Camera Jib', brand: 'PROAIM', category: 'Support', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Support Equipment - Large Gear', purchaseDate: '2022-02-20', purchasePrice: 1299, currentValue: 900, serialNumber: 'SN-JIB12-008', image: null,
    specs: { 'Support Type': 'Camera Jib/Crane', 'Max Payload': '11kg', 'Reach/Arm Length': '12ft (3.6m)' },
    notes: [], reservations: [], reminders: [], viewCount: 18, checkoutCount: 6 },

  // === GRIP (6) ===
  { id: 'GR1001', name: 'Matthews C-Stand (40" Chrome)', brand: 'Matthews', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Grip Storage - C-Stand Rack', purchaseDate: '2022-01-10', purchasePrice: 199, currentValue: 160, serialNumber: 'SN-CSTAND-001', image: null,
    specs: { 'Grip Type': 'C-Stand', 'Max Height': '10.5ft', 'Max Load Capacity': '22lbs', 'Junior/Baby Pin': '5/8" Pin' },
    notes: [], reservations: [], reminders: [], viewCount: 65, checkoutCount: 45 },
  
  { id: 'GR1002', name: 'Matthews C-Stand Kit (Set of 4)', brand: 'Matthews', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Grip Storage - C-Stand Rack', purchaseDate: '2021-06-15', purchasePrice: 796, currentValue: 550, serialNumber: 'SN-CSTAND4-002', image: null,
    specs: { 'Grip Type': 'C-Stand Kit (4)', 'Max Height': '10.5ft each', 'Max Load Capacity': '22lbs each' },
    notes: [], reservations: [], reminders: [], viewCount: 88, checkoutCount: 52 },
  
  { id: 'GR1003', name: 'Matthews 4x4 Floppy', brand: 'Matthews', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Grip Storage - Flag Rack', purchaseDate: '2023-02-20', purchasePrice: 189, currentValue: 160, serialNumber: 'SN-FLOP44-003', image: null,
    specs: { 'Grip Type': 'Flag/Floppy', 'Frame Size': '4x4ft', 'Fabric Type': 'Black Duvetyne' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 28 },
  
  { id: 'GR1004', name: 'Matthews 12x12 Frame Kit', brand: 'Matthews', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Grip Storage - Large Frame Rack', purchaseDate: '2022-09-10', purchasePrice: 899, currentValue: 750, serialNumber: 'SN-12X12-004', image: null,
    specs: { 'Grip Type': 'Butterfly Frame', 'Frame Size': '12x12ft', 'Fabric Type': 'Various (Silk, Solid, Griff)' },
    notes: [], reservations: [], reminders: [], viewCount: 25, checkoutCount: 10 },
  
  { id: 'GR1005', name: 'Matthews Doorway Dolly', brand: 'Matthews', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Grip Storage - Dolly Bay', purchaseDate: '2021-11-05', purchasePrice: 2495, currentValue: 1800, serialNumber: 'SN-DOLLY-005', image: null,
    specs: { 'Grip Type': 'Doorway Dolly', 'Max Load Capacity': '800lbs', 'Wheels/Casters': '8" pneumatic', 'Brakes': 'Yes' },
    notes: [], reservations: [], reminders: [], viewCount: 18, checkoutCount: 7 },
  
  { id: 'GR1006', name: 'Avenger Grip Arm Kit', brand: 'Avenger', category: 'Grip', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Grip Storage - Arm Rack', purchaseDate: '2023-01-15', purchasePrice: 349, currentValue: 300, serialNumber: 'SN-GRIPARM-006', image: null,
    specs: { 'Grip Type': 'Grip Arm Set', 'Reach/Arm Length': '20", 40" included', 'Max Load Capacity': '11lbs' },
    notes: [], reservations: [], reminders: [], viewCount: 52, checkoutCount: 35 },

  // === MONITORS (5) ===
  { id: 'MO1001', name: 'SmallHD Cine 7', brand: 'SmallHD', category: 'Monitors', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Monitor Cabinet - Shelf A', purchaseDate: '2023-02-28', purchasePrice: 2499, currentValue: 2100, serialNumber: 'SN-CINE7-001', image: null,
    specs: { 'Screen Size': '7"', 'Resolution': '1920x1200', 'Brightness': '1800 nits', 'Color Gamut': '100% DCI-P3', 'SDI Input': '12G-SDI' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 24 },
  
  { id: 'MO1002', name: 'Atomos Ninja V+', brand: 'Atomos', category: 'Monitors', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Monitor Cabinet - Shelf A', purchaseDate: '2023-05-10', purchasePrice: 999, currentValue: 850, serialNumber: 'SN-NINJAV-002', image: null,
    specs: { 'Screen Size': '5.2"', 'Resolution': '1920x1080', 'Brightness': '1000 nits', 'Recording': 'ProRes RAW, ProRes, DNx' },
    notes: [], reservations: [], reminders: [], viewCount: 62, checkoutCount: 35 },
  
  { id: 'MO1003', name: 'Atomos Shogun 7', brand: 'Atomos', category: 'Monitors', status: STATUS.CHECKED_OUT, checkedOutTo: 'DIT Station', checkedOutDate: daysAgo(4), dueBack: daysFromNow(3), condition: CONDITION.EXCELLENT, location: 'Monitor Cabinet - Shelf B', purchaseDate: '2022-08-20', purchasePrice: 1499, currentValue: 1100, serialNumber: 'SN-SHOGUN7-003', image: null,
    specs: { 'Screen Size': '7"', 'Resolution': '1920x1200', 'Brightness': '3000 nits', 'SDI Input': 'Quad 12G-SDI' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 22 },
  
  { id: 'MO1004', name: 'SmallHD Focus Pro OLED', brand: 'SmallHD', category: 'Monitors', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Monitor Cabinet - Shelf A', purchaseDate: '2023-07-15', purchasePrice: 1299, currentValue: 1150, serialNumber: 'SN-FOCUSOLED-004', image: null,
    specs: { 'Screen Size': '5.5"', 'Resolution': '1920x1080', 'Panel Type': 'OLED', 'Color Gamut': '100% DCI-P3', 'Touchscreen': 'Yes' },
    notes: [], reservations: [], reminders: [], viewCount: 28, checkoutCount: 12 },
  
  { id: 'MO1005', name: 'Feelworld LUT7S', brand: 'Feelworld', category: 'Monitors', status: STATUS.AVAILABLE, condition: CONDITION.GOOD, location: 'Monitor Cabinet - Shelf B', purchaseDate: '2023-01-05', purchasePrice: 259, currentValue: 200, serialNumber: 'SN-LUT7S-005', image: null,
    specs: { 'Screen Size': '7"', 'Resolution': '1920x1200', 'Brightness': '2200 nits', 'LUT Support': '3D LUT' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 25 },

  // === STORAGE (5) ===
  { id: 'ST1001', name: 'SanDisk Extreme PRO 512GB CFexpress Type B', brand: 'SanDisk', category: 'Storage', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Media Storage Cabinet', purchaseDate: '2023-06-10', purchasePrice: 449, currentValue: 380, serialNumber: 'SN-CFXB512-001', image: null,
    specs: { 'Storage Type': 'CFexpress Type B', 'Capacity': '512GB', 'Read Speed': '1700 MB/s', 'Write Speed': '1400 MB/s' },
    notes: [], reservations: [], reminders: [], viewCount: 55, checkoutCount: 32 },
  
  { id: 'ST1002', name: 'Sony TOUGH 160GB CFexpress Type A', brand: 'Sony', category: 'Storage', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Media Storage Cabinet', purchaseDate: '2023-04-25', purchasePrice: 398, currentValue: 350, serialNumber: 'SN-CFXA160-002', image: null,
    specs: { 'Storage Type': 'CFexpress Type A', 'Capacity': '160GB', 'Read Speed': '800 MB/s', 'Write Speed': '700 MB/s' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 28 },
  
  { id: 'ST1003', name: 'Samsung T7 Shield 2TB', brand: 'Samsung', category: 'Storage', status: STATUS.CHECKED_OUT, checkedOutTo: 'Editor - Tom', checkedOutDate: daysAgo(2), dueBack: daysFromNow(5), condition: CONDITION.EXCELLENT, location: 'Media Storage Cabinet', purchaseDate: '2023-08-15', purchasePrice: 219, currentValue: 190, serialNumber: 'SN-T7S2TB-003', image: null,
    specs: { 'Storage Type': 'External SSD', 'Capacity': '2TB', 'Interface': 'USB 3.2 Gen 2', 'Read Speed': '1050 MB/s' },
    notes: [], reservations: [], reminders: [], viewCount: 72, checkoutCount: 45 },
  
  { id: 'ST1004', name: 'LaCie Rugged SSD Pro 4TB', brand: 'LaCie', category: 'Storage', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Media Storage Cabinet', purchaseDate: '2023-03-20', purchasePrice: 749, currentValue: 650, serialNumber: 'SN-RUGSSD4-004', image: null,
    specs: { 'Storage Type': 'External SSD', 'Capacity': '4TB', 'Interface': 'Thunderbolt 3', 'Read Speed': '2800 MB/s' },
    notes: [], reservations: [], reminders: [], viewCount: 38, checkoutCount: 18 },
  
  { id: 'ST1005', name: 'ProGrade Digital 256GB V90 SDXC', brand: 'ProGrade', category: 'Storage', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Media Storage Cabinet', purchaseDate: '2023-09-05', purchasePrice: 199, currentValue: 175, serialNumber: 'SN-PGV90-005', image: null,
    specs: { 'Storage Type': 'SD Card', 'Capacity': '256GB', 'Read Speed': '250 MB/s', 'Video Speed Class': 'V90' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 28 },

  // === POWER (5) ===
  { id: 'PW1001', name: 'Anton Bauer Titon 150 V-Mount', brand: 'Anton Bauer', category: 'Power', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Power/Battery Cabinet', purchaseDate: '2023-04-15', purchasePrice: 450, currentValue: 400, serialNumber: 'SN-TITON150-001', image: null,
    specs: { 'Battery Type': 'V-Mount', 'Chemistry': 'Li-Ion', 'Capacity (Wh)': '156Wh', 'Voltage': '14.4V', 'D-Tap Outputs': '2', 'Airline Approved': 'Yes' },
    notes: [], reservations: [], reminders: [{ id: 'rem5', title: 'Battery health check', description: 'Check capacity and cell balance', dueDate: daysFromNow(30), recurrence: 'quarterly', completed: false, createdAt: daysAgo(60) }],
    viewCount: 52, checkoutCount: 28 },
  
  { id: 'PW1002', name: 'Anton Bauer Titon 150 V-Mount', brand: 'Anton Bauer', category: 'Power', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Power/Battery Cabinet', purchaseDate: '2023-04-15', purchasePrice: 450, currentValue: 400, serialNumber: 'SN-TITON150-002', image: null,
    specs: { 'Battery Type': 'V-Mount', 'Chemistry': 'Li-Ion', 'Capacity (Wh)': '156Wh', 'Voltage': '14.4V', 'D-Tap Outputs': '2', 'Airline Approved': 'Yes' },
    notes: [], reservations: [], reminders: [], viewCount: 48, checkoutCount: 26 },
  
  { id: 'PW1003', name: 'Core SWX Hypercore 98 (Gold Mount)', brand: 'Core SWX', category: 'Power', status: STATUS.CHECKED_OUT, checkedOutTo: 'Production Team A', checkedOutDate: daysAgo(1), dueBack: daysFromNow(6), condition: CONDITION.EXCELLENT, location: 'Power/Battery Cabinet', purchaseDate: '2023-01-25', purchasePrice: 385, currentValue: 340, serialNumber: 'SN-HC98-003', image: null,
    specs: { 'Battery Type': 'Gold Mount', 'Chemistry': 'Li-Ion', 'Capacity (Wh)': '98Wh', 'Voltage': '14.8V', 'Airline Approved': 'Yes' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 24 },
  
  { id: 'PW1004', name: 'Sony NP-FZ100 (4-Pack with Charger)', brand: 'Sony', category: 'Power', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Power/Battery Cabinet', purchaseDate: '2023-06-20', purchasePrice: 320, currentValue: 280, serialNumber: 'SN-FZ100-004', image: null,
    specs: { 'Battery Type': 'Sony NP-FZ100', 'Chemistry': 'Li-Ion', 'Capacity (Wh)': '16.4Wh each', 'Charger Included': 'Yes (dual)' },
    notes: [], reservations: [], reminders: [], viewCount: 68, checkoutCount: 42 },
  
  { id: 'PW1005', name: 'Canon LP-E6NH (4-Pack with Charger)', brand: 'Canon', category: 'Power', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Power/Battery Cabinet', purchaseDate: '2023-05-10', purchasePrice: 280, currentValue: 245, serialNumber: 'SN-LPE6NH-005', image: null,
    specs: { 'Battery Type': 'Canon LP-E6NH', 'Chemistry': 'Li-Ion', 'Capacity (Wh)': '14Wh each', 'Charger Included': 'Yes (dual)' },
    notes: [], reservations: [], reminders: [], viewCount: 55, checkoutCount: 35 },

  // === ACCESSORIES (5) ===
  { id: 'AC1001', name: 'Tilta Nucleus-M Wireless Follow Focus', brand: 'Tilta', category: 'Accessories', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet - Shelf A', purchaseDate: '2023-03-05', purchasePrice: 1199, currentValue: 1000, serialNumber: 'SN-NUCLEUSM-001', image: null,
    specs: { 'Accessory Type': 'Wireless Follow Focus', 'Compatibility': 'Universal (15mm/19mm rods)', 'Wireless Range': '300m', 'Channels': '7 motors' },
    notes: [], reservations: [], reminders: [], viewCount: 42, checkoutCount: 22 },
  
  { id: 'AC1002', name: 'SmallRig Cage for Sony A7S III', brand: 'SmallRig', category: 'Accessories', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet - Shelf A', purchaseDate: '2023-02-15', purchasePrice: 149, currentValue: 120, serialNumber: 'SN-CAGE-002', image: null,
    specs: { 'Accessory Type': 'Camera Cage', 'Compatibility': 'Sony A7S III/A7 IV', 'Material': 'Aluminum Alloy' },
    notes: [], reservations: [], reminders: [], viewCount: 58, checkoutCount: 35 },
  
  { id: 'AC1003', name: 'Wooden Camera UMB-1 Mattebox', brand: 'Wooden Camera', category: 'Accessories', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet - Shelf B', purchaseDate: '2022-11-20', purchasePrice: 995, currentValue: 800, serialNumber: 'SN-UMB1-003', image: null,
    specs: { 'Accessory Type': 'Mattebox', 'Compatibility': '15mm/19mm LWS', 'Filter Stages': '2 rotating, 1 fixed' },
    notes: [], reservations: [], reminders: [], viewCount: 32, checkoutCount: 14 },
  
  { id: 'AC1004', name: 'Tiffen 4x5.65 ND Filter Kit', brand: 'Tiffen', category: 'Accessories', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet - Filter Drawer', purchaseDate: '2023-01-10', purchasePrice: 899, currentValue: 780, serialNumber: 'SN-NDKIT-004', image: null,
    specs: { 'Accessory Type': 'ND Filter Set', 'Dimensions': '4x5.65"', 'Included': 'ND 0.3, 0.6, 0.9, 1.2' },
    notes: [], reservations: [], reminders: [], viewCount: 45, checkoutCount: 25 },
  
  { id: 'AC1005', name: 'PolarPro Variable ND 82mm', brand: 'PolarPro', category: 'Accessories', status: STATUS.AVAILABLE, condition: CONDITION.EXCELLENT, location: 'Accessories Cabinet - Filter Drawer', purchaseDate: '2023-07-25', purchasePrice: 299, currentValue: 265, serialNumber: 'SN-VND82-005', image: null,
    specs: { 'Accessory Type': 'Variable ND Filter', 'Thread Size': '82mm', 'ND Range': '2-5 stops' },
    notes: [], reservations: [], reminders: [], viewCount: 52, checkoutCount: 32 }
];

// ============================================================================
// PACKAGES (8)
// ============================================================================
export const initialPackages = [
  { id: 'pkg-interview', name: 'Interview Kit - 2 Person', description: 'Complete two-person interview setup with wireless audio and LED lighting', category: 'Audio',
    items: ['CA1001', 'LE1003', 'LI1001', 'LI1002', 'AU1003', 'AU1004', 'SU1001', 'SU1002', 'MO1001', 'PW1001'],
    notes: [{ id: 'pn1', user: 'Admin', date: daysAgo(60), text: 'Updated with new wireless lavs', replies: [], deleted: false }] },
  
  { id: 'pkg-doc', name: 'Documentary Run & Gun', description: 'Lightweight documentary setup - handheld friendly with quality audio', category: 'Cameras',
    items: ['CA1004', 'LE1001', 'LE1005', 'AU1001', 'AU1005', 'SU1003', 'MO1002', 'ST1001', 'PW1004'],
    notes: [] },
  
  { id: 'pkg-narrative', name: 'Narrative Film Package', description: 'Full cinema package for narrative productions', category: 'Cameras',
    items: ['CA1003', 'LE1002', 'LE1004', 'LE1006', 'LI1001', 'LI1004', 'LI1010', 'AU1001', 'AU1005', 'SU1001', 'SU1002', 'SU1006', 'MO1003', 'GR1002', 'GR1004', 'AC1001', 'AC1003', 'PW1001', 'PW1002'],
    notes: [] },
  
  { id: 'pkg-wedding', name: 'Wedding Photography/Video', description: 'Dual-camera setup for wedding coverage with fast primes', category: 'Cameras',
    items: ['CA1001', 'CA1002', 'LE1001', 'LE1006', 'LE1011', 'AU1007', 'MO1002', 'ST1002', 'PW1004', 'PW1005'],
    notes: [] },
  
  { id: 'pkg-corporate', name: 'Corporate Video Kit', description: 'Professional setup for corporate videos and talking heads', category: 'Cameras',
    items: ['CA1005', 'LE1009', 'LI1005', 'LI1012', 'LI1008', 'AU1002', 'AU1008', 'SU1004', 'SU1005', 'MO1004', 'ST1003', 'PW1004'],
    notes: [] },
  
  { id: 'pkg-music', name: 'Music Video Package', description: 'Dynamic setup with gimbal and creative lighting', category: 'Cameras',
    items: ['CA1006', 'LE1008', 'LE1003', 'LI1004', 'LI1010', 'LI1006', 'SU1003', 'SU1007', 'MO1001', 'GR1001', 'GR1003', 'AC1001', 'ST1001', 'PW1001', 'PW1003'],
    notes: [] },
  
  { id: 'pkg-photo', name: 'Portrait Photography Kit', description: 'Studio and location portrait kit with strobe lighting', category: 'Cameras',
    items: ['CA1009', 'LE1005', 'LE1012', 'LE1015', 'LI1011', 'LI1008', 'SU1005', 'GR1001', 'ST1005'],
    notes: [] },
  
  { id: 'pkg-event', name: 'Event Coverage Kit', description: 'Fast and flexible setup for live events and conferences', category: 'Cameras',
    items: ['CA1008', 'CA1007', 'LE1001', 'LE1007', 'AU1001', 'AU1007', 'SU1004', 'MO1005', 'ST1003', 'ST1005', 'PW1004'],
    notes: [] }
];

// ============================================================================
// KITS (Sample kit items for testing kit/container functionality)
// These are inventory items that act as containers for other items
// ============================================================================
export const initialKits = [
  {
    id: 'KIT001',
    name: 'Sony A7S III Travel Kit',
    brand: 'Studio Custom',
    category: 'Cameras',
    status: STATUS.AVAILABLE,
    condition: CONDITION.EXCELLENT,
    location: 'Studio A - Shelf 1',
    purchaseDate: '2024-01-15',
    purchasePrice: 0, // Kit case value only
    currentValue: 0,
    serialNumber: 'KIT-A7S3-TRAVEL',
    image: null,
    isKit: true,
    kitType: 'case',
    kitContents: ['CA1001', 'LE1006', 'ST1002', 'PW1004'], // Items inside this kit
    specs: { 'Case Type': 'Pelican 1510', 'Contents': '4 items', 'Total Value': '$5,828' },
    notes: [{ id: 'kn1', user: 'Admin', date: daysAgo(30), text: 'Pre-configured for quick travel shoots', replies: [], deleted: false }],
    reservations: [],
    reminders: [],
    viewCount: 12,
    checkoutCount: 5
  },
  {
    id: 'KIT002',
    name: 'Interview Lighting Kit',
    brand: 'Studio Custom',
    category: 'Lighting',
    status: STATUS.AVAILABLE,
    condition: CONDITION.EXCELLENT,
    location: 'Lighting Storage - Kit Area',
    purchaseDate: '2024-02-01',
    purchasePrice: 150, // Case cost
    currentValue: 100,
    serialNumber: 'KIT-INTV-LIGHT',
    image: null,
    isKit: true,
    kitType: 'case',
    kitContents: ['LI1001', 'LI1002', 'GR1001'], // 2 lights + C-stand
    specs: { 'Case Type': 'Rolling Case', 'Contents': '3 items', 'Purpose': 'Interview' },
    notes: [],
    reservations: [],
    reminders: [],
    viewCount: 8,
    checkoutCount: 3
  }
];

// ============================================================================
// USERS (Demo mode only - in production, use Supabase Auth)
// For demo mode, use password "demo" with any of these emails
// ============================================================================
export const initialUsers = [
  { id: 'u1', name: 'Admin', email: 'admin@demo.com', role: 'admin', roleId: 'role_admin' },
  { id: 'u2', name: 'Sarah Kim', email: 'sarah@demo.com', role: 'user', roleId: 'role_user' },
  { id: 'u3', name: 'Mike Thompson', email: 'mike@demo.com', role: 'user', roleId: 'role_user' },
  { id: 'u4', name: 'Alex Rivera', email: 'alex@demo.com', role: 'manager', roleId: 'role_manager' },
  { id: 'u5', name: 'Jennifer Lee', email: 'jennifer@demo.com', role: 'user', roleId: 'role_user' },
  { id: 'u6', name: 'David Chen', email: 'david@demo.com', role: 'viewer', roleId: 'role_viewer' },
  { id: 'u7', name: 'Emma Wilson', email: 'emma@demo.com', role: 'user', roleId: 'role_user' },
  { id: 'u8', name: 'Chris Martinez', email: 'chris@demo.com', role: 'user', roleId: 'role_user' }
];

// ============================================================================
// INITIAL STATES
// ============================================================================
export const initialAuditLog = [
  { type: 'system', timestamp: new Date().toISOString(), description: 'System initialized with sample data', user: 'System' }
];

export const initialPackLists = [];

// ============================================================================
// CLIENTS
// ============================================================================
export const initialClients = [
  {
    id: 'CL001',
    name: 'Acme Productions',
    type: 'Company',
    email: 'bookings@acmeproductions.com',
    phone: '555-100-2000',
    address: '123 Studio Way, Los Angeles, CA 90001',
    notes: 'Long-term client. Prefers Canon equipment.',
    favorite: true,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(30),
    clientNotes: [
      {
        id: 'cn1',
        user: 'Admin',
        date: daysAgo(60),
        text: 'Discussed potential long-term rental agreement for their new studio space.',
        deleted: false,
        replies: [
          {
            id: 'cn1r1',
            user: 'Sarah',
            date: daysAgo(58),
            text: 'They confirmed interest in a 6-month deal for lighting equipment.',
            deleted: false,
            replies: []
          }
        ]
      },
      {
        id: 'cn2',
        user: 'Mike',
        date: daysAgo(30),
        text: 'Client requested quote for RED Komodo package for upcoming commercial shoot.',
        deleted: false,
        replies: []
      }
    ],
  },
  {
    id: 'CL002',
    name: 'Sarah Johnson',
    type: 'Individual',
    company: 'Freelance Photographer',
    email: 'sarah.j@email.com',
    phone: '555-200-3000',
    address: '',
    notes: 'Wedding and event specialist',
    favorite: false,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(45),
  },
  {
    id: 'CL003',
    name: 'TechCorp Inc',
    type: 'Company',
    email: 'media@techcorp.com',
    phone: '555-300-4000',
    address: '456 Innovation Blvd, San Francisco, CA 94102',
    notes: 'Corporate video projects. Net 30 payment terms.',
    favorite: true,
    createdAt: daysAgo(240),
    updatedAt: daysAgo(15),
    clientNotes: [
      {
        id: 'cn3',
        user: 'Admin',
        date: daysAgo(20),
        text: 'Annual product launch event scheduled for Q2. Will need full video production kit.',
        deleted: false,
        replies: []
      }
    ],
  },
  {
    id: 'CL004',
    name: 'Bright Ideas Agency',
    type: 'Agency',
    email: 'rentals@brightideas.co',
    phone: '555-400-5000',
    address: '789 Creative Ave, New York, NY 10001',
    notes: 'Ad agency - usually books full kits',
    favorite: false,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
  {
    id: 'CL005',
    name: 'Michael Chen',
    type: 'Individual',
    company: 'Documentary Films',
    email: 'mchen@docfilms.net',
    phone: '555-500-6000',
    address: '',
    notes: 'Documentary filmmaker. Often needs long-term rentals.',
    favorite: false,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
  },
];
