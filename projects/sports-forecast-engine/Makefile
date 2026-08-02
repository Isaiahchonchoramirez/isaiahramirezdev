CXX ?= clang++
CXXFLAGS := -std=c++20 -O2 -Wall -Wextra -pedantic
TARGET := sports-forecast

.PHONY: all case-study clean
all: $(TARGET)

$(TARGET): src/main.cpp
	$(CXX) $(CXXFLAGS) $< -o $@

case-study: $(TARGET)
	./$(TARGET) data/premier-league-2015-16.csv > ../../public/data/case-studies/sports-forecast-engine.json

clean:
	rm -f $(TARGET)
