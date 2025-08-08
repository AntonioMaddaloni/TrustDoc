# Copyright (c) Open Enclave SDK contributors.
# Licensed under the MIT License.

include ../../config.mk

CRYPTO_LDFLAGS := $(shell pkg-config oeenclave-$(COMPILER) --variable=${OE_CRYPTO_LIB}libs)

ifeq ($(LVI_MITIGATION), ControlFlow)
    ifeq ($(LVI_MITIGATION_BINDIR),)
        $(error LVI_MITIGATION_BINDIR is not set)
    endif
    # Only run once.
    ifeq (,$(findstring $(LVI_MITIGATION_BINDIR),$(CC)))
        CC := $(LVI_MITIGATION_BINDIR)/$(CC)
    endif
    COMPILER := $(COMPILER)-lvi-cfg
    CRYPTO_LDFLAGS := $(shell pkg-config oeenclave-$(COMPILER) --variable=${OE_CRYPTO_LIB}libslvicfg)
endif

ifeq ($(OE_CRYPTO_LIB),openssl_3)
  CFLAGS=$(shell pkg-config oeenclave-$(COMPILER) --variable=${OE_CRYPTO_LIB}flags)
else
  CFLAGS=$(shell pkg-config oeenclave-$(COMPILER) --cflags)
endif
LDFLAGS=$(shell pkg-config oeenclave-$(COMPILER) --libs)
INCDIR=$(shell pkg-config oeenclave-$(COMPILER) --variable=includedir)

all:
	$(MAKE) build
	$(MAKE) keys
	$(MAKE) sign

build:
	@ echo "Compilers used: $(CC), $(CXX)"
	oeedger8r ../trustdoc.edl --trusted \
		--search-path $(INCDIR) \
		--search-path $(INCDIR)/openenclave/edl/sgx
	$(CC) -g -c $(CFLAGS) -DOE_API_VERSION=2 enc.c -o enc.o
	$(CC) -g -c $(CFLAGS) -DOE_API_VERSION=2 trustdoc_t.c -o trustdoc_t.o
	$(CC) -o enclave trustdoc_t.o enc.o $(LDFLAGS) $(CRYPTO_LDFLAGS)

sign:
	oesign sign -e enclave -c trustdoc.conf -k private.pem

clean:
	rm -f enc.o enclave enclave.signed private.pem public.pem trustdoc_t.o trustdoc_t.h trustdoc_t.c _args.h

keys:
	openssl genrsa -out private.pem -3 3072
	openssl rsa -in private.pem -pubout -out public.pem
