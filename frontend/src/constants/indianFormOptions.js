/**
 * Standardized Real-World Indian Options Data for Frontend
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

/**
 * Helper to dynamically resolve best options for any detected form field
 */
export function resolveFieldOptions(field) {
  if (field.options && Array.isArray(field.options) && field.options.length > 0) {
    return { type: 'explicit', options: field.options }
  }

  const id = String(field.id || '').toLowerCase()
  const label = String(field.label || '').toLowerCase()
  const combined = `${id} ${label}`

  if (combined.includes('course') || combined.includes('degree') || combined.includes('standard') || combined.includes('class') || combined.includes('stream')) {
    return { type: 'grouped', groups: INDIAN_COURSES_BY_LEVEL }
  }

  if (combined.includes('state') || combined.includes('province') || combined.includes('domicile')) {
    return { type: 'flat', options: INDIAN_STATES_AND_UTS }
  }

  if (combined.includes('category') || combined.includes('caste') || combined.includes('reservation')) {
    return { type: 'flat', options: SOCIAL_CATEGORIES }
  }

  if (combined.includes('gender') || combined.includes('ling') || combined.includes('sex')) {
    return { type: 'flat', options: GENDERS }
  }

  if (combined.includes('occupation') || combined.includes('employment') || combined.includes('profession')) {
    return { type: 'flat', options: OCCUPATIONS }
  }

  return null
}

