# Copyright (c) Open Enclave SDK contributors.
# Licensed under the MIT License.
add_custom_command(
  OUTPUT trustdoc_u.h trustdoc_u.c trustdoc_args.h
  DEPENDS ${CMAKE_SOURCE_DIR}/trustdoc.edl
  COMMAND
    openenclave::oeedger8r --untrusted ${CMAKE_SOURCE_DIR}/trustdoc.edl
    --search-path ${OE_INCLUDEDIR} --search-path
    ${OE_INCLUDEDIR}/openenclave/edl/sgx)

add_executable(trustdoc_host host.c
                               ${CMAKE_CURRENT_BINARY_DIR}/trustdoc_u.c)

if (WIN32)
  copy_oedebugrt_target(trustdoc_host_oedebugrt)
  add_dependencies(trustdoc_host trustdoc_host_oedebugrt)
endif ()

target_include_directories(
  trustdoc_host PRIVATE # Needed for the generated file helloworld_u.h
                          ${CMAKE_CURRENT_BINARY_DIR})

target_link_libraries(trustdoc_host openenclave::oehost)
