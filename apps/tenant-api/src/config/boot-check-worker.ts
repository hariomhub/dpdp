// Same as boot-check.ts, for the background worker process (it needs fewer settings).
import './index'
import { assertValidConfig } from './validate'

assertValidConfig(process.env, 'worker')
