---
title: Rasterizer
description: Small C software rasterizer.
tags: [C, Raylib]
repo-url: https://github.com/jqyDee/software-rasterizer.c
card: 3
---

This project was born from a desire to truly understand what happens "under the
hood" of modern graphics cards. Instead of using high-level APIs like OpenGL or
Vulkan, I chose to build a 3D rasterizer entirely from scratch in C, using
Raylib only as a window and pixel buffer host. From parsing raw `.obj` files and
implementing custom matrix math to manually calculating barycentric coordinates
for triangle rasterization, this project forced me to confront the core
geometry and linear algebra that power every frame on your screen. It was
an intensive deep dive into the 3D graphics pipeline &mdash; transforming vertices
from local space all the way to a 2D screen &mdash; and it gave me a profound new
appreciation for the hardware acceleration we usually take for granted.

