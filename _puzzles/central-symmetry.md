---
title: "Central Symmetry"
creation_date: 2026-09-21
order: 13
rules:
  - name: "Classic Sudoku"
    desc: "Every row, column and 3x3 box must contain every number from 1 to 9."
  - name: "Entropic Lines"
    desc: "Every sequential group of 3 cells on a line must have a low digit {1,2,3}, a medium digit {4,5,6}, and a high digit {7,8,9}."
  - name: "Arrows"
    desc: "Numbers along an arrow sum up to the total in the circled cells; the circled value is read left to right or top to down if composed by multiple digits."
  - name: "Greater/Less"
    desc: "If two digits are separated by a \"<\", the smaller one in on the side where the \"<\" points to."
  - name: "Even"
    desc: "A digit inside a grey square must be even."
---