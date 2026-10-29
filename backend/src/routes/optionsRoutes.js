/**
 * Real-World Options Routes for Indian Government & Civic Portals
 * Provides standardized state lists, academic courses, categories, and templates.
 */

import { Router } from 'express'
import {
  INDIAN_STATES_AND_UTS,
  INDIAN_COURSES_BY_LEVEL,
  FLAT_INDIAN_COURSES,
  SOCIAL_CATEGORIES,
  GENDERS,
  OCCUPATIONS,
  OFFICIAL_TEMPLATES
} from '../data/indianOptions.js'

const router = Router()

// All options aggregated
router.get('/all', (req, res) => {
  res.json({
    states: INDIAN_STATES_AND_UTS,
    coursesByLevel: INDIAN_COURSES_BY_LEVEL,
    courses: FLAT_INDIAN_COURSES,
    categories: SOCIAL_CATEGORIES,
    genders: GENDERS,
    occupations: OCCUPATIONS,
    templates: OFFICIAL_TEMPLATES
  })
})

// Specific endpoints
router.get('/states', (req, res) => {
  res.json({ count: INDIAN_STATES_AND_UTS.length, states: INDIAN_STATES_AND_UTS })
})

router.get('/courses', (req, res) => {
  res.json({
    byLevel: INDIAN_COURSES_BY_LEVEL,
    flat: FLAT_INDIAN_COURSES,
    flatCourses: FLAT_INDIAN_COURSES
  })
})

router.get('/categories', (req, res) => {
  res.json({ categories: SOCIAL_CATEGORIES })
})

router.get('/templates', (req, res) => {
  res.json({ count: OFFICIAL_TEMPLATES.length, templates: OFFICIAL_TEMPLATES })
})

export default router
