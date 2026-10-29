/**
 * Standardized Real-World Indian Options Data
 * Covers all 28 States, 8 Union Territories, comprehensive academic streams,
 * social categories, and employment classifications.
 */

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
]

export const INDIAN_COURSES_BY_LEVEL = {
  'Secondary & Higher Secondary': [
    '10th Standard (Matriculation / Secondary Board)',
    '11th Standard (Higher Secondary First Year)',
    '12th Standard - Science (PCM)',
    '12th Standard - Science (PCB)',
    '12th Standard - Commerce',
    '12th Standard - Arts / Humanities'
  ],
  'Diploma & Vocational': [
    'Polytechnic Diploma (Engineering)',
    'Polytechnic Diploma (Non-Engineering)',
    'ITI Certificate (Industrial Training)',
    'Vocational Skill Training Certificate'
  ],
  'Undergraduate Degrees': [
    'B.Tech / B.E. (Computer Science & Engineering)',
    'B.Tech / B.E. (Information Technology)',
    'B.Tech / B.E. (Mechanical / Civil / Electrical)',
    'B.Sc (General / Physics / Chemistry / Math)',
    'B.Sc (Information Technology / Data Science)',
    'B.Com (General / Accounting & Finance)',
    'B.A. (History / Political Science / Economics)',
    'BCA (Bachelor of Computer Applications)',
    'BBA (Bachelor of Business Administration)',
    'B.Ed (Bachelor of Education)',
    'MBBS (Bachelor of Medicine & Surgery)',
    'BDS (Dental Surgery)',
    'B.Pharm (Pharmacy)',
    'LL.B (Bachelor of Legislative Law)'
  ],
  'Postgraduate & Higher Education': [
    'M.Tech / M.E. (Engineering)',
    'M.Sc (Sciences / IT)',
    'M.Com (Commerce / Finance)',
    'M.A. (Humanities / Social Sciences)',
    'MCA (Master of Computer Applications)',
    'MBA (Business Administration)',
    'LL.M (Master of Laws)',
    'Ph.D / Doctorate'
  ]
}

export const FLAT_INDIAN_COURSES = Object.values(INDIAN_COURSES_BY_LEVEL).flat()

export const SOCIAL_CATEGORIES = [
  'General / Unreserved (UR)',
  'Other Backward Classes - Non-Creamy Layer (OBC-NCL)',
  'Other Backward Classes - Creamy Layer (OBC-CL)',
  'Scheduled Caste (SC)',
  'Scheduled Tribe (ST)',
  'Economically Weaker Section (EWS)'
]

export const GENDERS = [
  'Male',
  'Female',
  'Transgender',
  'Other'
]

export const OCCUPATIONS = [
  'Farmer / Agriculture (किसान)',
  'Salaried Employee (Private Sector)',
  'Government Employee / PSU',
  'Self-Employed / Business Owner (व्यापारी)',
  'Daily Wage Worker / Laborer (श्रमिक)',
  'Student / Scholar (विद्यार्थी)',
  'Homemaker (गृहिणी)',
  'Retired / Pensioner (सेवानिवृत्त)',
  'Other / Unemployed'
]

export const OFFICIAL_TEMPLATES = [
  {
    id: 'scholarship',
    title: 'National Scholarship Portal Application (NSP)',
    titleHindi: 'राष्ट्रीय छात्रवृत्ति पोर्टल आवेदन',
    category: 'Education & Welfare',
    department: 'Ministry of Electronics & Information Technology, Govt. of India',
    description: 'Post-Matric, Pre-Matric, and Top Class Education Merit Schemes for Indian Students.',
    fieldCount: 10
  },
  {
    id: 'healthcare',
    title: 'Ayushman Bharat PM-JAY Patient Intake & OPD Form',
    titleHindi: 'आयुष्मान भारत रोगी भर्ती एवं ओपीडी फॉर्म',
    category: 'Healthcare & Hospital',
    department: 'National Health Authority (NHA)',
    description: 'Universal cashless medical coverage and clinical OPD triage registration.',
    fieldCount: 8
  },
  {
    id: 'pension',
    title: 'National Social Assistance Programme (NSAP) Senior Citizen Pension',
    titleHindi: 'राष्ट्रीय सामाजिक सहायता कार्यक्रम वृद्धावस्था पेंशन',
    category: 'Social Security',
    department: 'Ministry of Rural Development',
    description: 'Monthly direct benefit transfer (DBT) pension for senior citizens and widows.',
    fieldCount: 7
  },
  {
    id: 'pmkisan',
    title: 'PM-Kisan Samman Nidhi Farmer Beneficiary Enrollment',
    titleHindi: 'प्रधानमंत्री किसान सम्मान निधि योजना',
    category: 'Agriculture',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Income support of ₹6,000 per year for all landholding farmer families.',
    fieldCount: 8
  },
  {
    id: 'domicile',
    title: 'State Domicile / Resident Certificate Application',
    titleHindi: 'मूल निवास / अधिवास प्रमाण पत्र आवेदन',
    category: 'Revenue & Civil',
    department: 'Department of Revenue & Land Records',
    description: 'Official proof of permanent residence required for state quota admissions and government jobs.',
    fieldCount: 9
  },
  {
    id: 'castecert',
    title: 'Caste / Community Verification Certificate Application',
    titleHindi: 'जाति / समुदाय सत्यापन प्रमाण पत्र',
    category: 'Social Justice',
    department: 'Ministry of Social Justice & Empowerment',
    description: 'Verification of OBC, SC, ST, or EWS community eligibility for reservation quotas.',
    fieldCount: 8
  }
]
