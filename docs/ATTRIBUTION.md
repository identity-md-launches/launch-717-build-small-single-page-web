# Design reference attribution

The interface review applied the assignment's pinned Better Interface guidance, adapted from Jakub Krehel's Better Interface, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e` (MIT).

The structure of DESIGN.md follows the pinned documentation method adapted from Paul Bakaus's Impeccable, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8` (Apache-2.0). This document describes an original implementation; the upstream guidance was adapted to this browser game and its actual tokens and components.

The supplied license texts and copyright notices are preserved in [interface-guide-licenses.txt](interface-guide-licenses.txt). No reference material is required at runtime. All game artwork, interface icons, and the favicon were drawn for this implementation with Canvas or SVG. Fonts come from the operating system; no font files or external services are loaded.

Build and validation packages retain their own licenses as identified in package-lock.json. They are development dependencies; none is shipped as a third-party runtime library in the production export.
