---
layout: default
title: GiAnMMV's Puzzles
permalink: /puzzles/
---

<h1>GiAnMMV's Puzzles</h1>

<div class="puzzle-grid">
  {% for puzzle in site.puzzles %}
    <a href="{{ puzzle.url | relative_url }}" class="puzzle-card">
      <img src="{{ puzzle.image | relative_url }}" alt="{{ puzzle.title }}">
      <h3>{{ puzzle.title }}</h3>
    </a>
  {% endfor %}
</div>
