---
title: Kropki Construction
creation_date: "2026-11-26"
order: 60
sudokupad_url: https://sudokupad.app/rwnuq03ucj
lmd_id: 000W8L
rules:
  - name: Classic Sudoku
    desc: Every row, column and 3x3 box must contain every number from 1 to 9.
  - name: Kropki
    desc: Two digits separated by a white dot are consecutive; two digits separated by a black dot have a 1:2 ratio.
  - name: Chaos Construction
    desc: |
      There are 9 orthogonally continuous regions in which each digit from 1 to 9 occurs exactly once. These regions must be found, considering that:
      - no 4x4 square can belong entirely to one region;
      - a white kropki always sits on a region border;
      - a black kropki separates two digits belonging to the same region.
---