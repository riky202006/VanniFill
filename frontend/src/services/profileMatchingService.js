/**
 * Profile-to-Form Field Matching Service
 * 
 * Compares detected form fields from an uploaded document with the user's
 * saved personal information (My Information) to produce intelligent, safe suggestions.
 * 
 * CORE SAFETY GUARDRAILS:
 * 1. Zero Guessing: Never guesses bank account numbers, government identity numbers,
 *    income, or sensitive unverified data.
 * 2. Non-Destructive: Never silently overwrites values already found in the document.
 * 3. Human Confirmation: All suggestions require user confirmation ("Use This Value").
 * 4. Clear Provenance: Each suggestion is tagged with source, confidence, and explanation.
 */

/**
 * Matches detected document fields with user profile information.
 * 
 * @param {Array} fields - Array of detected field objects from OCR / document analysis
 * @param {Object} profile - User's saved profile (from My Information)
 * @returns {Object} Map of fieldId -> MatchSuggestion
 */
export function matchFieldsWithProfile(fields = [], profile = null) {
  if (!fields || !fields.length || !profile) return {}

  const suggestions = {}

  fields.forEach((field) => {
    // If field already has a non-empty value pre-extracted from OCR in the original document,
    // do not replace it automatically. User can still manually edit.
    if (field.detectedValue && String(field.detectedValue).trim() !== '') {
      return
    }

    const fieldLabel = (field.label || '').toLowerCase().trim()
    const fieldId = (field.id || '').toLowerCase().trim()
    const searchTarget = `${fieldId} ${fieldLabel}`

    // ------------------------------------------------------------------------
    // Explicit Guardrail: Blacklist sensitive or transactional fields
    // ------------------------------------------------------------------------
    if (
      searchTarget.includes('bank') ||
      searchTarget.includes('account number') ||
      searchTarget.includes('ifsc') ||
      searchTarget.includes('income') ||
      searchTarget.includes('aadhaar') ||
      searchTarget.includes('pan card') ||
      searchTarget.includes('passport number') ||
      searchTarget.includes('ssn') ||
      searchTarget.includes('signature') ||
      searchTarget.includes('declaration')
    ) {
      // Do not suggest matches for sensitive credentials or financial declarations
      return
    }

    // ------------------------------------------------------------------------
    // 1. Basic Information Matching
    // ------------------------------------------------------------------------
    if (
      profile.basic?.fullName &&
      (searchTarget.includes('applicant name') ||
        searchTarget.includes('candidate name') ||
        searchTarget.includes('student name') ||
        searchTarget.includes('patient name') ||
        searchTarget.includes('full name') ||
        searchTarget.includes('name of applicant') ||
        searchTarget === 'name')
    ) {
      suggestions[field.id] = {
        value: profile.basic.fullName,
        confidence: 'high',
        sourceCategory: 'Basic Information',
        sourceLabel: 'Full Name',
        explanation: 'Matched with saved Full Name in My Information.',
      }
      return
    }

    if (
      profile.basic?.dateOfBirth &&
      (searchTarget.includes('date of birth') ||
        searchTarget.includes('dob') ||
        searchTarget.includes('birth date') ||
        searchTarget.includes('birthdate'))
    ) {
      suggestions[field.id] = {
        value: profile.basic.dateOfBirth,
        confidence: 'high',
        sourceCategory: 'Basic Information',
        sourceLabel: 'Date of Birth',
        explanation: 'Matched with saved Date of Birth.',
      }
      return
    }

    if (
      profile.basic?.gender &&
      (searchTarget.includes('gender') || searchTarget.includes('sex'))
    ) {
      suggestions[field.id] = {
        value: profile.basic.gender,
        confidence: 'high',
        sourceCategory: 'Basic Information',
        sourceLabel: 'Gender',
        explanation: 'Matched with saved Gender.',
      }
      return
    }

    if (
      profile.basic?.nationality &&
      (searchTarget.includes('nationality') || searchTarget.includes('citizenship'))
    ) {
      suggestions[field.id] = {
        value: profile.basic.nationality,
        confidence: 'high',
        sourceCategory: 'Basic Information',
        sourceLabel: 'Nationality',
        explanation: 'Matched with saved Nationality.',
      }
      return
    }

    if (
      profile.basic?.category &&
      (searchTarget.includes('category') || searchTarget.includes('caste') || searchTarget.includes('reservation') || searchTarget.includes('shreni'))
    ) {
      suggestions[field.id] = {
        value: profile.basic.category,
        confidence: 'high',
        sourceCategory: 'Basic Information',
        sourceLabel: 'Social Category',
        explanation: 'Matched with saved Social Category in My Information.',
      }
      return
    }

    // ------------------------------------------------------------------------
    // 2. Contact Information Matching
    // ------------------------------------------------------------------------
    if (
      profile.contact?.email &&
      (searchTarget.includes('email') || searchTarget.includes('e-mail'))
    ) {
      suggestions[field.id] = {
        value: profile.contact.email,
        confidence: 'high',
        sourceCategory: 'Contact Information',
        sourceLabel: 'Email Address',
        explanation: 'Matched with saved Email Address.',
      }
      return
    }

    if (
      profile.contact?.phone &&
      (searchTarget.includes('phone') ||
        searchTarget.includes('mobile') ||
        searchTarget.includes('contact number') ||
        searchTarget.includes('cell') ||
        searchTarget.includes('telephone'))
    ) {
      suggestions[field.id] = {
        value: profile.contact.phone,
        confidence: 'high',
        sourceCategory: 'Contact Information',
        sourceLabel: 'Phone Number',
        explanation: 'Matched with saved Phone Number.',
      }
      return
    }

    // ------------------------------------------------------------------------
    // 3. Education Information Matching
    // ------------------------------------------------------------------------
    if (
      profile.education?.institution &&
      (searchTarget.includes('institution') ||
        searchTarget.includes('college') ||
        searchTarget.includes('university') ||
        searchTarget.includes('school name'))
    ) {
      suggestions[field.id] = {
        value: profile.education.institution,
        confidence: 'high',
        sourceCategory: 'Education',
        sourceLabel: 'Institution Name',
        explanation: 'Matched with saved Institution Name.',
      }
      return
    }

    if (
      profile.education?.course &&
      (searchTarget.includes('course') ||
        searchTarget.includes('programme') ||
        searchTarget.includes('degree') ||
        searchTarget.includes('branch'))
    ) {
      suggestions[field.id] = {
        value: profile.education.course,
        confidence: 'high',
        sourceCategory: 'Education',
        sourceLabel: 'Course / Programme',
        explanation: 'Matched with saved Course.',
      }
      return
    }

    if (
      profile.education?.registrationNumber &&
      (searchTarget.includes('roll') ||
        searchTarget.includes('registration no') ||
        searchTarget.includes('reg no') ||
        searchTarget.includes('enrollment'))
    ) {
      suggestions[field.id] = {
        value: profile.education.registrationNumber,
        confidence: 'high',
        sourceCategory: 'Education',
        sourceLabel: 'Registration Number',
        explanation: 'Matched with saved Registration Number.',
      }
      return
    }

    // ------------------------------------------------------------------------
    // 4. Family Information Matching
    // ------------------------------------------------------------------------
    if (
      profile.family?.fatherName &&
      (searchTarget.includes('father') || searchTarget.includes("father's name"))
    ) {
      suggestions[field.id] = {
        value: profile.family.fatherName,
        confidence: 'high',
        sourceCategory: 'Family Information',
        sourceLabel: "Father's Name",
        explanation: "Matched with saved Father's Name.",
      }
      return
    }

    if (
      profile.family?.motherName &&
      (searchTarget.includes('mother') || searchTarget.includes("mother's name"))
    ) {
      suggestions[field.id] = {
        value: profile.family.motherName,
        confidence: 'high',
        sourceCategory: 'Family Information',
        sourceLabel: "Mother's Name",
        explanation: "Matched with saved Mother's Name.",
      }
      return
    }

    if (
      profile.family?.guardianName &&
      (searchTarget.includes('guardian') || searchTarget.includes("guardian's name"))
    ) {
      suggestions[field.id] = {
        value: profile.family.guardianName,
        confidence: 'high',
        sourceCategory: 'Family Information',
        sourceLabel: "Guardian's Name",
        explanation: "Matched with saved Guardian's Name.",
      }
      return
    }

    // ------------------------------------------------------------------------
    // 5. Employment Information Matching
    // ------------------------------------------------------------------------
    if (
      profile.employment?.employer &&
      (searchTarget.includes('employer') ||
        searchTarget.includes('company') ||
        searchTarget.includes('organization'))
    ) {
      suggestions[field.id] = {
        value: profile.employment.employer,
        confidence: 'high',
        sourceCategory: 'Employment',
        sourceLabel: 'Employer',
        explanation: 'Matched with saved Employer.',
      }
      return
    }

    if (
      profile.employment?.occupation &&
      (searchTarget.includes('occupation') || searchTarget.includes('profession') || searchTarget.includes('employment type'))
    ) {
      suggestions[field.id] = {
        value: profile.employment.occupation,
        confidence: 'high',
        sourceCategory: 'Employment',
        sourceLabel: 'Occupation',
        explanation: 'Matched with saved Occupation Category in My Information.',
      }
      return
    }

    if (
      profile.employment?.jobTitle &&
      (searchTarget.includes('designation') ||
        searchTarget.includes('job title') ||
        searchTarget.includes('role'))
    ) {
      suggestions[field.id] = {
        value: profile.employment.jobTitle,
        confidence: 'high',
        sourceCategory: 'Employment',
        sourceLabel: 'Job Title',
        explanation: 'Matched with saved Job Title.',
      }
      return
    }

    // ------------------------------------------------------------------------
    // 6. Address Information Matching
    // ------------------------------------------------------------------------
    const perm = profile.address?.permanent
    const curr = profile.address?.current

    if (perm?.postalCode && (searchTarget.includes('pin') || searchTarget.includes('postal') || searchTarget.includes('zip'))) {
      suggestions[field.id] = {
        value: perm.postalCode,
        confidence: 'high',
        sourceCategory: 'Address',
        sourceLabel: 'Postal Code',
        explanation: 'Matched with saved Postal Code.',
      }
      return
    }

    if (perm?.state && searchTarget.includes('state') && !searchTarget.includes('statement')) {
      suggestions[field.id] = {
        value: perm.state,
        confidence: 'high',
        sourceCategory: 'Address',
        sourceLabel: 'State',
        explanation: 'Matched with saved Permanent State.',
      }
      return
    }

    if (perm?.city && (searchTarget.includes('city') || searchTarget.includes('district') || searchTarget.includes('town'))) {
      suggestions[field.id] = {
        value: perm.city,
        confidence: 'high',
        sourceCategory: 'Address',
        sourceLabel: 'City / District',
        explanation: 'Matched with saved City in Address.',
      }
      return
    }

    // Full Address String matching
    if (searchTarget.includes('permanent address') || (searchTarget.includes('address') && !searchTarget.includes('current'))) {
      if (perm && (perm.houseNumber || perm.street || perm.city)) {
        const addrStr = [
          perm.houseNumber,
          perm.street,
          perm.locality,
          perm.city,
          perm.state,
          perm.postalCode,
        ]
          .filter(Boolean)
          .join(', ')

        if (addrStr) {
          suggestions[field.id] = {
            value: addrStr,
            confidence: 'medium',
            sourceCategory: 'Address',
            sourceLabel: 'Permanent Address',
            explanation: 'Compiled from saved Permanent Address fields.',
          }
          return
        }
      }
    }

    if (searchTarget.includes('current address') || searchTarget.includes('correspondence address')) {
      const activeAddr = curr || perm
      if (activeAddr && (activeAddr.houseNumber || activeAddr.street || activeAddr.city)) {
        const addrStr = [
          activeAddr.houseNumber,
          activeAddr.street,
          activeAddr.locality,
          activeAddr.city,
          activeAddr.state,
          activeAddr.postalCode,
        ]
          .filter(Boolean)
          .join(', ')

        if (addrStr) {
          suggestions[field.id] = {
            value: addrStr,
            confidence: 'medium',
            sourceCategory: 'Address',
            sourceLabel: 'Current Address',
            explanation: 'Compiled from saved Current Address fields.',
          }
          return
        }
      }
    }

    // ------------------------------------------------------------------------
    // 7. Custom Fields Matching
    // ------------------------------------------------------------------------
    if (Array.isArray(profile.customFields)) {
      const matchedCustom = profile.customFields.find((cf) => {
        if (!cf.label || !cf.value) return false
        const customLabel = cf.label.toLowerCase().trim()
        return (
          fieldLabel === customLabel ||
          searchTarget.includes(customLabel) ||
          customLabel.includes(fieldLabel)
        )
      })

      if (matchedCustom) {
        suggestions[field.id] = {
          value: matchedCustom.value,
          confidence: 'high',
          sourceCategory: 'Additional Information',
          sourceLabel: matchedCustom.label,
          explanation: `Matched with custom field "${matchedCustom.label}".`,
        }
      }
    }
  })

  return suggestions
}
