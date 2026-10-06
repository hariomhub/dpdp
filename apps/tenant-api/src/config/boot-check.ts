// Imported FIRST by the API entry point: loads .env, then validates it, before any module that creates a database
// client or reads a setting gets a chance to fail in a less helpful way.
import './index'
import { assertValidConfig } from './validate'

assertValidConfig(process.env, 'api')
