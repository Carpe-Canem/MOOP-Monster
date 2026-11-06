# MOOP Monster

*MOOP = Matter Out Of Place.*

A browser arcade climber. See [DESIGN.md](DESIGN.md) for the full design and plan.

## Run it

Needs Node.js (LTS).

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run simtest    # automated checks of the gameplay rules
npm run build      # static site in dist/
npm run art:preview                 # enlarged sheet of every sprite -> assets/preview/sprites.png
npm run art:bezels                  # still game frame + bezel mockups -> assets/preview/
npm run art:pixelize -- <image> --w 16 --h 16 [--colors 3] [--name key] [--bg black]
                                    # Leonardo concept -> starting-point pixel sprite (assets/pixel/)
```

Sprites live as text grids in `src/art/*.ts` (one character per pixel, with a small colour legend
drawn from the master palette in `src/view/palette.ts`).

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Walk, climb |
| Space / Z | Jump |
| P / Esc | Pause |
| M | Mute / unmute (remembered) |
| T (title screen) | Sound test |
| Enter | Start, continue |
