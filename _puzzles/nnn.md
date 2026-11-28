---
title: NNN
creation_date: "2026-11-28"
difficulty: 2
order: 62
sudokupad_url: https://sudokupad.app/d68iu5dpmu
lmd_id: 000W9R
rules:
  - name: Classic Sudoku
    desc: Every row, column and 3x3 box must contain every number from 1 to 9.
  - name: Chinese Whispers
    desc: Every two consecutive digits along a yellow line must have a difference of at most 2.
  - name: Entropic Lines
    desc: Every sequential group of 3 cells on a peach line must have a low digit {1,2,3}, a medium digit {4,5,6}, and a high digit {7,8,9}.
  - name: Parity Lines
    desc: Every pair of consecutive cells along a red line must contain an odd digit and an even digit.
  - name: Modular Lines
    desc: Every sequential group of 3 cells on a teal line must have a digit from {1,4,7}, a digit from {2,5,8}, and a digit from {3,6,9}.
  - name: Renban
    desc: All digits along a purple line must form a consecutive sequence (in no specific order).
  - name: Dutch Whispers
    desc: Every two consecutive digits along an orange line must have a difference of at least 4.
  - name: Double Arrows
    desc: The sum of the digits along a grey line is equal to the sum of the two circles at its ends.
  - name: German Whispers
    desc: Every two consecutive digits along a green line must have a difference of at least 5.
  - name: Thermometers
    desc: Along thermometers, digits must increase from the bulb.
  - name: Kropki
    desc: Two digits separated by a white dot are consecutive.
---