#include "trustdoc_t.h"
#include <openenclave/enclave.h>
#include <mbedtls/sha256.h>

void compute_sha256(uint8_t* data, size_t data_size, uint8_t* hash, size_t hash_size)
{
    if (!data || !hash || hash_size < 32 || data_size == 0)
        return;
    
    if (hash_size < 32) // SHA-256 produce 32 byte
        return;

    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    mbedtls_sha256_starts_ret(&ctx, 0); // 0 = SHA-256 (non SHA-224)
    mbedtls_sha256_update_ret(&ctx, data, data_size);
    mbedtls_sha256_finish_ret(&ctx, hash);
    mbedtls_sha256_free(&ctx);
}
