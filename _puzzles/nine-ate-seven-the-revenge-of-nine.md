---
title: Nine Ate Seven – The Revenge of Nine
creation_date: "2026-11-05"
order: 48
sudokupad_url: https://sudokupad.app/bafe1gbsnf
lmd_id: 000VW6
rules:
  - name: Classic Sudoku
    desc: Every row, column and 3x3 box must contain every number from 1 to 9.
  - name: Nine Ate Seven
    desc: |-
      Considering the grid as a finite plan (opposite sides are not connected), the following rules apply to 7, 8 and 9:
      - **Nine Eats Seven:** If a 7 and a 9 on the same row/column are one cell apart, the digit between them must be an 8.
      - **Seven Flees From Nine:** 7 and 9 are never orthogonally adjacent.
      - **Nine Only Eats Seven:** If 9 and 8 are adjacent, the digit on the other side of 8 must be a 7.
      - **Only Nine Eats Seven:** If 7 and 8 are adjacent, the digit on the other side of 8 must be a 9.
  - name: Kropki
    desc: Two digits separated by a white dot are consecutive; two digits separated by a black dot have a 1:2 ratio.
---