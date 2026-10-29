/**
 * Pre-defined Form Schemas for VaaniFill AI
 * Used by backend validation, Gemini extraction, and frontend/extension matching.
 */

export const FORM_SCHEMAS = {
  scholarship: {
    id: "scholarship",
    title: "National Scholarship Application (NSP)",
    titleHindi: "राष्ट्रीय छात्रवृत्ति पोर्टल आवेदन",
    description: "Post-Matric & Merit Scholarship for Higher Education",
    fields: [
      {
        id: "fullName",
        label: "Full Name / पूरा नाम",
        type: "text",
        required: true,
        placeholder: "Enter candidate's full legal name"
      },
      {
        id: "dob",
        label: "Date of Birth / जन्म तिथि",
        type: "date",
        required: true,
        placeholder: "YYYY-MM-DD"
      },
      {
        id: "gender",
        label: "Gender / लिंग",
        type: "select",
        options: ["Male", "Female", "Other"],
        required: true
      },
      {
        id: "category",
        label: "Social Category / सामाजिक श्रेणी",
        type: "select",
        options: ["General", "OBC", "SC", "ST", "EWS"],
        required: true
      },
      {
        id: "mobile",
        label: "Mobile Number / मोबाइल नंबर",
        type: "tel",
        required: true,
        placeholder: "10-digit mobile number"
      },
      {
        id: "email",
        label: "Email Address / ईमेल",
        type: "email",
        required: true,
        placeholder: "name@example.com"
      },
      {
        id: "annualIncome",
        label: "Family Annual Income (₹) / वार्षिक आय",
        type: "number",
        required: true,
        placeholder: "e.g. 250000"
      },
      {
        id: "state",
        label: "Domicile State / मूल राज्य",
        type: "text",
        required: true,
        placeholder: "e.g. Assam, Delhi, Bihar"
      },
      {
        id: "courseName",
        label: "Current Course / वर्तमान पाठ्यक्रम",
        type: "text",
        required: false,
        placeholder: "e.g. B.Tech, BCA, B.Sc"
      },
      {
        id: "collegeName",
        label: "College / University Name",
        type: "text",
        required: false,
        placeholder: "Institution name"
      }
    ]
  },

  healthcare: {
    id: "healthcare",
    title: "Ayushman Health Intake & Clinic Registration",
    titleHindi: "आयुष्मान स्वास्थ्य पंजीयन प्रपत्र",
    description: "OPD Patient Intake and Emergency Contact Form",
    fields: [
      {
        id: "patientName",
        label: "Patient Name / मरीज़ का नाम",
        type: "text",
        required: true
      },
      {
        id: "age",
        label: "Age (Years) / उम्र",
        type: "number",
        required: true
      },
      {
        id: "gender",
        label: "Gender / लिंग",
        type: "select",
        options: ["Male", "Female", "Other"],
        required: true
      },
      {
        id: "contactNumber",
        label: "Contact Number / संपर्क सूत्र",
        type: "tel",
        required: true
      },
      {
        id: "emergencyContact",
        label: "Emergency Contact / आपातकालीन संपर्क",
        type: "tel",
        required: false
      },
      {
        id: "cityDistrict",
        label: "City / District / शहर या जिला",
        type: "text",
        required: true
      },
      {
        id: "symptoms",
        label: "Chief Symptoms / मुख्य लक्षण",
        type: "text",
        required: true
      }
    ]
  },

  pension: {
    id: "pension",
    title: "National Senior Citizen Pension Scheme",
    titleHindi: "राष्ट्रीय वृद्धावस्था पेंशन योजना",
    description: "Social Security Pension Application for Senior Citizens",
    fields: [
      {
        id: "fullName",
        label: "Full Name / आवेदक का नाम",
        type: "text",
        required: true
      },
      {
        id: "age",
        label: "Age / आयु",
        type: "number",
        required: true
      },
      {
        id: "mobile",
        label: "Mobile Number / मोबाइल नंबर",
        type: "tel",
        required: true
      },
      {
        id: "postalCode",
        label: "PIN Code / पिन कोड",
        type: "text",
        required: true
      },
      {
        id: "cityDistrict",
        label: "City / District / ज़िला",
        type: "text",
        required: true
      },
      {
        id: "bankAccountNumber",
        label: "Bank Account Number / बैंक खाता संख्या",
        type: "text",
        required: true
      }
    ]
  }
}

export function getFormSchema(formId) {
  return FORM_SCHEMAS[formId] || FORM_SCHEMAS.scholarship
}
