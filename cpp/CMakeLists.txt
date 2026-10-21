cmake_minimum_required(VERSION 3.14)
project(NaviDSANavigator VERSION 2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_executable(navi_dsa
    graph.cpp
    graph.h
    algorithms.cpp
    algorithms.h
    navi_dsa.cpp
)

target_compile_options(navi_dsa PRIVATE
    $<$<CXX_COMPILER_ID:GNU>:-O3 -Wall -Wextra>
    $<$<CXX_COMPILER_ID:Clang>:-O3 -Wall -Wextra>
    $<$<CXX_COMPILER_ID:MSVC>:/O2 /W4>
)
