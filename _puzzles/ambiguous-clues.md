---
title: "Ambiguous Clues"
creation_date: 2026-10-03
order: 33
rules:
  - name: "Classic Sudoku"
    desc: "Every row, column and 3x3 box must contain every number from 1 to 9."
  - name: "Ambiguous Clues"
    desc: |
        All clues outside the grid with the same color represent the same rule; two clues of different colors cannot represent the same rule. The possible rules are:
        1. Skyscrapers: Each digit in the grid represents the height of a building in its cell, and taller buildings obstruct the view of shorter ones behind them: a clue gives the number of buildings visible from that vantage point in the clue's row or column.
        2. Sandwich Sums: A clue indicates the sum of the digits between 1 and 9 in the indicated row or column.
        3. X-Sums: A clue indicates the sum of the first X digits of its row or column, where X is the digit placed in the first cell in that direction.
        4. Numbered Rooms: A clue indicates the digit which has to be placed in the Xth cell in the corresponding direction, where X is the digit placed in the first cell in that direction.
---