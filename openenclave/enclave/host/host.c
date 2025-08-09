#include <openenclave/host.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "trustdoc_u.h"

int main(int argc, const char* argv[])
{
    oe_enclave_t* enclave = NULL;
    oe_result_t result;
    uint32_t flags = OE_ENCLAVE_FLAG_DEBUG;
    uint8_t* buffer = NULL;
    size_t total_size = 0;
    size_t capacity = 4096; // Inizia con 4KB

    // Verifica argomenti
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <file_path|-> \n", argv[0]);
        fprintf(stderr, "Use '-' to read from stdin\n");
        return 1;
    }

    // Crea enclave
    result = oe_create_trustdoc_enclave(
        "enclave.signed", OE_ENCLAVE_TYPE_AUTO, flags, NULL, 0, &enclave);
    if (result != OE_OK) {
        fprintf(stderr, "Failed to create enclave: %s\n", oe_result_str(result));
        return 1;
    }

    // Determina se leggere da file o da stdin
    if (strcmp(argv[1], "-") == 0) {
        // Leggi da stdin
        buffer = malloc(capacity);
        if (!buffer) {
            fprintf(stderr, "Initial memory allocation failed\n");
            oe_terminate_enclave(enclave);
            return 1;
        }

        size_t bytes_read;
        while ((bytes_read = fread(buffer + total_size, 1, capacity - total_size, stdin)) > 0) {
            total_size += bytes_read;
            
            // Se siamo vicini al limite, raddoppia la capacità
            if (total_size >= capacity - 1024) {
                capacity *= 2;
                uint8_t* new_buffer = realloc(buffer, capacity);
                if (!new_buffer) {
                    fprintf(stderr, "Memory reallocation failed at %zu bytes\n", capacity);
                    free(buffer);
                    oe_terminate_enclave(enclave);
                    return 1;
                }
                buffer = new_buffer;
            }
        }

        if (total_size == 0) {
            fprintf(stderr, "No data read from stdin\n");
            free(buffer);
            oe_terminate_enclave(enclave);
            return 1;
        }

    } else {
        // Leggi da file
        FILE* file = fopen(argv[1], "rb");
        if (!file) {
            fprintf(stderr, "Cannot open file: %s\n", argv[1]);
            oe_terminate_enclave(enclave);
            return 1;
        }

        // Determina dimensione file
        if (fseek(file, 0, SEEK_END) != 0) {
            fprintf(stderr, "Failed to seek to end of file\n");
            fclose(file);
            oe_terminate_enclave(enclave);
            return 1;
        }

        long file_size = ftell(file);
        if (file_size < 0) {
            fprintf(stderr, "Failed to get file size\n");
            fclose(file);
            oe_terminate_enclave(enclave);
            return 1;
        }

        if (fseek(file, 0, SEEK_SET) != 0) {
            fprintf(stderr, "Failed to seek to beginning of file\n");
            fclose(file);
            oe_terminate_enclave(enclave);
            return 1;
        }

        total_size = (size_t)file_size;

        // Alloca memoria per il contenuto del file
        buffer = malloc(total_size);
        if (!buffer) {
            fprintf(stderr, "Memory allocation failed for %zu bytes\n", total_size);
            fclose(file);
            oe_terminate_enclave(enclave);
            return 1;
        }

        // Leggi file in memoria
        size_t bytes_read = fread(buffer, 1, total_size, file);
        fclose(file);
        
        if (bytes_read != total_size) {
            fprintf(stderr, "Failed to read entire file: read %zu of %zu bytes\n", 
                    bytes_read, total_size);
            free(buffer);
            oe_terminate_enclave(enclave);
            return 1;
        }
    }

    // Calcola hash usando l'enclave
    uint8_t hash[32];
    result = compute_sha256(enclave, buffer, total_size, hash, sizeof(hash));
    
    // Pulisci memoria sensibile
    free(buffer);

    if (result != OE_OK) {
        fprintf(stderr, "Failed to compute SHA256: %s\n", oe_result_str(result));
        oe_terminate_enclave(enclave);
        return 1;
    }

    // Stampa hash in formato esadecimale su stdout
    for (int i = 0; i < 32; i++) {
        printf("%02x", hash[i]);
    }
    printf("\n");

    // Termina enclave
    oe_terminate_enclave(enclave);
    return 0;
}