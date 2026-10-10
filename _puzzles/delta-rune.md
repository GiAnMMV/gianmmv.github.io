---
title: "Delta Rune"
date: 2026-09-27
order: 20
rules:
  - name: "Classic Sudoku"
    desc: "Every row, column and 3x3 box must contain every number from 1 to 9."
  - name: "Arrows"
    desc: "Numbers along an arrow sum up to the total in the circled cell."
  - name: "Palindrome Lines"
    desc: "Digits along a grey line read the same backwards and forwards."
  - name: "Region Sum Lines"
    desc: "Box borders divide a blue line into multiple segments which have the same sum."
  - name: "Renban"
    desc: "All digits along a purple line must form a consecutive sequence (in no specific order)."
  - name: "German Whispers"
    desc: "Every two consecutive digits along a green line must have a difference of at least 5."
  - name: "Counting Circles"
    desc: "Any digit in a circle indicates exactly how many circles contain that digit (arrow circles are NOT included)."
  - name: "Kropki"
    desc: "Two digits separated by a white dot are consecutive; two digits separated by a black dot have a 1:2 ratio."
---