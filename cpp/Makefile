# Makefile for NAVI 2.0 C++ DSA Engine
CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -I.

TARGET = navi_dsa
SRCS = graph.cpp algorithms.cpp navi_dsa.cpp
OBJS = $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET) navi_dsa.exe

run: $(TARGET)
	./$(TARGET) data/cities.txt data/roads.txt Kadapa Vijayawada

.PHONY: all clean run
