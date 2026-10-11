---
sudokupad_url: "https://sudokupad.app/b891s080k2"
title: "Midoku"
creation_date: 2026-10-08
order: 40
rules:
  - name: "Classic Sudoku"
    desc: "Every row, column and 3x3 box must contain every number from 1 to 9."
  - name: "Region Sum Lines"
    desc: "Box borders divide a blue line into multiple segments which have the same sum. Different lines may have different sums."
  - name: "Entropic Lines"
    desc: "Every sequential group of 3 cells on a peach line must have a low digit {1,2,3}, a medium digit {4,5,6}, and a high digit {7,8,9}."
  - name: "Palindrome Lines"
    desc: "Digits along a grey line read the same backwards and forwards."
  - name: "Kropki"
    desc: "Digits separated by a white dot are consecutive; digits separated by a black dot have a 1:2 ratio."
---