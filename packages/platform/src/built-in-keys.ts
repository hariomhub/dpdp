import { TrustKey } from './licence'

/**
 * The public keys every released image trusts to sign licences - the vendor's PRODUCTION signing key(s).
 *
 * This is code, not a setting, on purpose: it is compiled into the image (bundlers include it; nothing is read from disk
 * at run time), so an operator cannot swap it by changing configuration. A public key is not a secret, so it is committed.
 *
 * TO DO BEFORE THE FIRST PRODUCTION RELEASE: generate the production signing key pair in a managed key store (the private
 * half never leaves it), and add its public half here:
 *
 *   { kid: '2026-1', publicKey: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n' },
 *
 * Until then this list is empty and a production instance cannot verify any licence (it stays read-only, "no licence").
 * Rotation: ship a release that trusts BOTH keys, start signing with the new one, later drop the old (docs/architecture).
 */
export const BUILT_IN_TRUST_KEYS: TrustKey[] = []
