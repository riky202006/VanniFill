/**
 * VaaniFill AI - Citizen Profile Data Model
 * 
 * Canonical representation of user personal information.
 * Used for storing user details once and reusing them when filling digital forms.
 */

export const createEmptyProfile = () => ({
  basic: {
    fullName: '',
    dateOfBirth: '',
    gender: '',
    category: '',
    nationality: 'Indian',
  },
  contact: {
    email: '',
    phone: '',
  },
  address: {
    permanent: {
      houseNumber: '',
      street: '',
      locality: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    current: {
      houseNumber: '',
      street: '',
      locality: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
  },
  education: {
    institution: '',
    course: '',
    department: '',
    registrationNumber: '',
    qualification: '',
  },
  family: {
    fatherName: '',
    motherName: '',
    guardianName: '',
  },
  employment: {
    employer: '',
    jobTitle: '',
    occupation: '',
    experience: '',
  },
  customFields: [],
})

/**
 * Explicit Development Testing Fixture
 * Clearly labelled as sample data for UI evaluation.
 * Does not represent any real user's personal identity.
 */
export const SAMPLE_PROFILE_FIXTURE = {
  basic: {
    fullName: 'Riky Nayak',
    dateOfBirth: '2001-08-15',
    gender: 'Male',
    category: 'General / Unreserved (UR)',
    nationality: 'Indian',
  },
  contact: {
    email: 'riky@example.com',
    phone: '9876543210',
  },
  address: {
    permanent: {
      houseNumber: 'Flat 402, Green Enclave',
      street: 'GS Road',
      locality: 'Dispur',
      city: 'Guwahati',
      state: 'Assam',
      postalCode: '781005',
      country: 'India',
    },
    current: {
      houseNumber: 'Flat 402, Green Enclave',
      street: 'GS Road',
      locality: 'Dispur',
      city: 'Guwahati',
      state: 'Assam',
      postalCode: '781005',
      country: 'India',
    },
  },
  education: {
    institution: 'Assam Down Town University',
    course: 'Bachelor of Technology',
    department: 'Computer Science & Engineering',
    registrationNumber: 'ADTU/2022/CS/084',
    qualification: "Bachelor's Degree",
  },
  family: {
    fatherName: 'B. C. Nayak',
    motherName: 'Sunita Nayak',
    guardianName: 'B. C. Nayak',
  },
  employment: {
    employer: 'Ctrl Freaks Lab',
    jobTitle: 'Frontend Engineer',
    occupation: 'Salaried Employee (Private Sector)',
    experience: '2 Years',
  },
  customFields: [
    {
      id: 'custom_blood_group',
      label: 'Blood Group',
      value: 'O+',
    },
    {
      id: 'custom_preferred_lang',
      label: 'Preferred Language',
      value: 'Assamese & English',
    },
  ],
}

/**
 * Normalizes raw backend profile data (both flat and nested schemas)
 * into the canonical profile structure.
 */
export function normalizeProfile(raw) {
  const empty = createEmptyProfile()
  if (!raw || typeof raw !== 'object') return empty

  // If already structured with 'basic'
  if (raw.basic) {
    return {
      basic: { ...empty.basic, ...raw.basic },
      contact: { ...empty.contact, ...raw.contact },
      address: {
        permanent: { ...empty.address.permanent, ...(raw.address?.permanent || {}) },
        current: { ...empty.address.current, ...(raw.address?.current || {}) },
      },
      education: { ...empty.education, ...raw.education },
      family: { ...empty.family, ...raw.family },
      employment: { ...empty.employment, ...raw.employment },
      customFields: Array.isArray(raw.customFields) ? raw.customFields : [],
    }
  }

  // Handle flat backend profile shape (e.g. from existing User model)
  return {
    basic: {
      fullName: raw.fullName || raw.name || '',
      dateOfBirth: raw.dob || '',
      gender: raw.gender || '',
      nationality: raw.nationality || 'Indian',
    },
    contact: {
      email: raw.email || '',
      phone: raw.mobile || raw.phone || '',
    },
    address: {
      permanent: {
        ...empty.address.permanent,
        state: raw.state || '',
        postalCode: raw.postalCode || '',
        city: raw.city || '',
      },
      current: {
        ...empty.address.current,
        state: raw.state || '',
        postalCode: raw.postalCode || '',
        city: raw.city || '',
      },
    },
    education: {
      ...empty.education,
      institution: raw.institution || '',
      course: raw.course || '',
    },
    family: {
      ...empty.family,
      fatherName: raw.fatherName || '',
      motherName: raw.motherName || '',
    },
    employment: {
      ...empty.employment,
      employer: raw.employer || '',
      jobTitle: raw.jobTitle || '',
    },
    customFields: Array.isArray(raw.customFields) ? raw.customFields : [],
  }
}

/**
 * Prepares profile object for backend transmission,
 * preserving both nested sections and root fields for backward compatibility.
 */
export function serializeProfileForBackend(profile) {
  return {
    ...profile,
    // Flattened top-level mirrors for legacy backend schemas
    fullName: profile.basic?.fullName || '',
    dob: profile.basic?.dateOfBirth || '',
    gender: profile.basic?.gender || '',
    email: profile.contact?.email || '',
    mobile: profile.contact?.phone || '',
    state: profile.address?.permanent?.state || '',
    postalCode: profile.address?.permanent?.postalCode || '',
  }
}

/**
 * Validates obvious formatting issues without being overly restrictive.
 */
export function validateProfile(profile) {
  const errors = {}

  // Contact: Email
  if (profile.contact?.email && profile.contact.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.contact.email.trim())) {
      errors.email = 'Please provide a valid email address format (e.g. name@domain.com).'
    }
  }

  // Contact: Phone
  if (profile.contact?.phone && profile.contact.phone.trim()) {
    const digitsOnly = profile.contact.phone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      errors.phone = 'Phone number should be between 10 and 13 digits.'
    }
  }

  // Address: Postal Code
  if (profile.address?.permanent?.postalCode && profile.address.permanent.postalCode.trim()) {
    const pin = profile.address.permanent.postalCode.trim()
    if (!/^\d{5,6}$/.test(pin)) {
      errors.postalCode = 'Postal code is typically 5 or 6 digits.'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
