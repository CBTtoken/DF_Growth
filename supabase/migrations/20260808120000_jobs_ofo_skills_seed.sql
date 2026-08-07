-- Curated starter skills per OFO sub-major group. These are OUR editorial
-- content (plain SA English, phone-audience wording), not DHET data -- the
-- OFO workbook carries no skill lists. What the structure guarantees is the
-- handoff's hard rule: each skill row is FK-bound to exactly one sub-major
-- group, and the UI queries only the groups the person's chosen occupations
-- belong to, so a bricklaying skill appearing under sales is structurally
-- impossible rather than filtered out. Free-text skills stay allowed in the
-- UI and live in jobs_candidates.skills, never here, never used for matching.

insert into jobs_ofo_skills (sub_major_code, label) values
  ('11', 'Strategic planning'), ('11', 'Budgeting'), ('11', 'Public speaking'),
  ('11', 'Stakeholder engagement'), ('11', 'Governance'), ('11', 'Policy development'),
  ('11', 'Team leadership'), ('11', 'Negotiation'),

  ('12', 'Budgeting'), ('12', 'Staff management'), ('12', 'Project management'),
  ('12', 'Reporting'), ('12', 'Contract negotiation'), ('12', 'Procurement'),
  ('12', 'HR processes'), ('12', 'Financial planning'),

  ('13', 'Operations management'), ('13', 'Health and safety'), ('13', 'Quality control'),
  ('13', 'Production planning'), ('13', 'Staff scheduling'), ('13', 'Cost control'),
  ('13', 'Maintenance planning'), ('13', 'Logistics'),

  ('14', 'Stock control'), ('14', 'Staff rosters'), ('14', 'Customer service'),
  ('14', 'Cash-up and banking'), ('14', 'Supplier orders'), ('14', 'Front of house'),
  ('14', 'Food safety'), ('14', 'Sales targets'),

  ('21', 'Technical drawing'), ('21', 'Project management'), ('21', 'CAD'),
  ('21', 'Data analysis'), ('21', 'Report writing'), ('21', 'Site inspections'),
  ('21', 'Quality assurance'), ('21', 'Cost estimation'),

  ('22', 'Patient care'), ('22', 'Clinical assessment'), ('22', 'Medication administration'),
  ('22', 'Record keeping'), ('22', 'Infection control'), ('22', 'First aid'),
  ('22', 'Patient education'), ('22', 'Emergency response'),

  ('23', 'Lesson planning'), ('23', 'Classroom management'), ('23', 'Assessment and marking'),
  ('23', 'Curriculum development'), ('23', 'Learner support'), ('23', 'Parent communication'),
  ('23', 'E-learning tools'), ('23', 'Extracurricular coaching'),

  ('24', 'Financial reporting'), ('24', 'Auditing'), ('24', 'Payroll'),
  ('24', 'Tax returns'), ('24', 'Budgeting'), ('24', 'Data analysis'),
  ('24', 'Presentations'), ('24', 'Compliance'),

  ('25', 'Programming'), ('25', 'Databases'), ('25', 'Networking'),
  ('25', 'Cloud services'), ('25', 'Troubleshooting'), ('25', 'Web development'),
  ('25', 'IT security'), ('25', 'Systems analysis'),

  ('26', 'Legal drafting'), ('26', 'Research'), ('26', 'Counselling'),
  ('26', 'Case management'), ('26', 'Community outreach'), ('26', 'Report writing'),
  ('26', 'Public speaking'), ('26', 'Mediation'),

  ('31', 'Equipment maintenance'), ('31', 'Technical drawing'), ('31', 'Site supervision'),
  ('31', 'Sampling and testing'), ('31', 'Quality control'), ('31', 'Instrument calibration'),
  ('31', 'Health and safety'), ('31', 'Surveying'),

  ('32', 'Patient care'), ('32', 'Taking vital signs'), ('32', 'First aid'),
  ('32', 'Wound care'), ('32', 'Medication support'), ('32', 'Record keeping'),
  ('32', 'Infection control'), ('32', 'Home visits'),

  ('33', 'Bookkeeping'), ('33', 'Invoicing'), ('33', 'Debt collection'),
  ('33', 'Sales support'), ('33', 'Office administration'), ('33', 'Spreadsheets'),
  ('33', 'Customer accounts'), ('33', 'Quotations'),

  ('34', 'Community work'), ('34', 'Sports coaching'), ('34', 'Event coordination'),
  ('34', 'Photography'), ('34', 'Case administration'), ('34', 'Youth work'),
  ('34', 'Counselling support'), ('34', 'Record keeping'),

  ('35', 'PC repairs'), ('35', 'Network cabling'), ('35', 'Printer support'),
  ('35', 'Software installation'), ('35', 'CCTV systems'), ('35', 'Help desk support'),
  ('35', 'Hardware upgrades'), ('35', 'Wi-Fi setup'),

  ('41', 'Typing'), ('41', 'Filing'), ('41', 'Data capture'),
  ('41', 'Switchboard'), ('41', 'Diary management'), ('41', 'Email correspondence'),
  ('41', 'Microsoft Office'), ('41', 'Reception'),

  ('42', 'Customer service'), ('42', 'Call centre systems'), ('42', 'Complaint handling'),
  ('42', 'Cash handling'), ('42', 'Bookings and reservations'), ('42', 'Upselling'),
  ('42', 'Data capture'), ('42', 'Switchboard'),

  ('43', 'Stock taking'), ('43', 'Invoicing'), ('43', 'Creditors and debtors'),
  ('43', 'Payroll capture'), ('43', 'Receiving and dispatch'), ('43', 'Spreadsheets'),
  ('43', 'Purchase orders'), ('43', 'Cycle counts'),

  ('44', 'Filing'), ('44', 'Mail sorting'), ('44', 'Data capture'),
  ('44', 'Photocopying and scanning'), ('44', 'Records management'), ('44', 'Reception relief'),
  ('44', 'Courier coordination'), ('44', 'Archiving'),

  ('51', 'Customer service'), ('51', 'Food preparation'), ('51', 'Barista skills'),
  ('51', 'Waitering'), ('51', 'Housekeeping'), ('51', 'Tour guiding'),
  ('51', 'Childminding'), ('51', 'Grooming services'),

  ('52', 'Selling'), ('52', 'Cash handling'), ('52', 'Merchandising'),
  ('52', 'Stock control'), ('52', 'Customer service'), ('52', 'Point of sale systems'),
  ('52', 'Upselling'), ('52', 'Product knowledge'),

  ('53', 'Patient care'), ('53', 'Elder care'), ('53', 'First aid'),
  ('53', 'Meal preparation'), ('53', 'Medication reminders'), ('53', 'Mobility support'),
  ('53', 'Companionship'), ('53', 'Hygiene care'),

  ('54', 'Access control'), ('54', 'Patrolling'), ('54', 'CCTV monitoring'),
  ('54', 'Incident reports'), ('54', 'Crowd control'), ('54', 'Armed response'),
  ('54', 'Fire safety'), ('54', 'First aid'),

  ('61', 'Livestock handling'), ('61', 'Crop planting'), ('61', 'Irrigation'),
  ('61', 'Tractor operation'), ('61', 'Fencing'), ('61', 'Animal health'),
  ('61', 'Harvesting'), ('61', 'Record keeping'),

  ('62', 'Chainsaw operation'), ('62', 'Tree felling'), ('62', 'Boat handling'),
  ('62', 'Net repair'), ('62', 'Fish handling'), ('62', 'Tracking'),
  ('62', 'Firearm safety'), ('62', 'Outdoor survival'),

  ('63', 'Vegetable growing'), ('63', 'Poultry keeping'), ('63', 'Goat and cattle care'),
  ('63', 'Fishing'), ('63', 'Food preservation'), ('63', 'Hand tools'),
  ('63', 'Water management'), ('63', 'Selling at markets'),

  ('64', 'Bricklaying'), ('64', 'Plastering'), ('64', 'Tiling'),
  ('64', 'Painting'), ('64', 'Plumbing basics'), ('64', 'Roofing'),
  ('64', 'Concrete work'), ('64', 'Reading building plans'),

  ('65', 'Welding'), ('65', 'Grinding'), ('65', 'Fitting'),
  ('65', 'Turning'), ('65', 'Machine maintenance'), ('65', 'Reading technical drawings'),
  ('65', 'Rigging'), ('65', 'Sheet metal work'),

  ('66', 'Sewing'), ('66', 'Pattern making'), ('66', 'Upholstery'),
  ('66', 'Printing machine operation'), ('66', 'Binding and finishing'), ('66', 'Signwriting'),
  ('66', 'Leatherwork'), ('66', 'Screen printing'),

  ('67', 'Wiring'), ('67', 'Fault finding'), ('67', 'Solar installation'),
  ('67', 'DB boards'), ('67', 'Motor repairs'), ('67', 'Appliance repair'),
  ('67', 'Cable joining'), ('67', 'Testing and certification'),

  ('68', 'Baking'), ('68', 'Butchery'), ('68', 'Cabinet making'),
  ('68', 'Wood machining'), ('68', 'Garment sewing'), ('68', 'Food safety'),
  ('68', 'Meat cutting'), ('68', 'Furniture finishing'),

  ('71', 'Machine operation'), ('71', 'Production line work'), ('71', 'Quality checks'),
  ('71', 'Machine cleaning'), ('71', 'Packing machines'), ('71', 'Boiler operation'),
  ('71', 'Safety procedures'), ('71', 'Shift work'),

  ('72', 'Assembly line work'), ('72', 'Hand tools'), ('72', 'Quality inspection'),
  ('72', 'Component fitting'), ('72', 'Fast accurate work'), ('72', 'Following diagrams'),
  ('72', 'Electronics assembly'), ('72', 'Packing'),

  ('73', 'Code 8 driving'), ('73', 'Code 10 driving'), ('73', 'Code 14 driving'),
  ('73', 'Forklift operation'), ('73', 'Excavator operation'), ('73', 'Route planning'),
  ('73', 'Vehicle inspections'), ('73', 'Load securing'),

  ('81', 'Office cleaning'), ('81', 'Deep cleaning'), ('81', 'Window cleaning'),
  ('81', 'Laundry and ironing'), ('81', 'Housekeeping'), ('81', 'Industrial cleaning'),
  ('81', 'Waste handling'), ('81', 'Chemical safety'),

  ('82', 'Planting'), ('82', 'Weeding'), ('82', 'Harvesting'),
  ('82', 'Packing produce'), ('82', 'Moving irrigation'), ('82', 'Livestock feeding'),
  ('82', 'Loading'), ('82', 'General farm work'),

  ('83', 'Digging and trenching'), ('83', 'Mixing concrete'), ('83', 'Loading and offloading'),
  ('83', 'Site cleanup'), ('83', 'Carrying materials'), ('83', 'Demolition'),
  ('83', 'Warehouse work'), ('83', 'Physical stamina'),

  ('84', 'Food preparation'), ('84', 'Dishwashing'), ('84', 'Kitchen cleaning'),
  ('84', 'Serving'), ('84', 'Stock rotation'), ('84', 'Food safety'),
  ('84', 'Vegetable prep'), ('84', 'Fast food service'),

  ('85', 'Street vending'), ('85', 'Car guarding'), ('85', 'Shoe repairs'),
  ('85', 'Informal trading'), ('85', 'Cash handling'), ('85', 'Customer service'),
  ('85', 'Stock buying'), ('85', 'Negotiation'),

  ('86', 'Refuse collection'), ('86', 'Recycling sorting'), ('86', 'Sweeping'),
  ('86', 'Garden services'), ('86', 'Meter reading'), ('86', 'Parking attendance'),
  ('86', 'Trolley collection'), ('86', 'Odd jobs');
