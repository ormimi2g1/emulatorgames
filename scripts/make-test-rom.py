#!/usr/bin/env python3
"""Builds tests/fixtures/color-test.nes: a tiny original NES program written for this
project's tests (public domain / CC0). It fills the screen with sky blue and turns it
green while the A button is held, so tests can check the emulator runs and reads input."""
import pathlib

ORG = 0xC000
code = bytearray()
labels, fixups = {}, []

def emit(*b): code.extend(b)
def label(n): labels[n] = ORG + len(code)
def abs_(op, addr): emit(op, addr & 0xFF, addr >> 8)
def branch(op, target): emit(op, 0); fixups.append(('rel', len(code) - 1, target))
def jmp(target): emit(0x4C, 0, 0); fixups.append(('abs', len(code) - 2, target))

label('reset')
emit(0x78, 0xD8)                 # SEI, CLD
emit(0xA2, 0x40); abs_(0x8E, 0x4017)  # disable APU frame IRQ
emit(0xA2, 0xFF, 0x9A, 0xE8)     # LDX #$FF, TXS, INX (X=0)
abs_(0x8E, 0x2000); abs_(0x8E, 0x2001); abs_(0x8E, 0x4010)
for n in ('vw1', 'vw2'):         # wait two vblanks for the PPU to warm up
    label(n); abs_(0x2C, 0x2002); branch(0x10, n)
emit(0xA9, 0x21, 0x85, 0x00)     # color = $21 (sky blue)
label('main')
label('wait'); abs_(0x2C, 0x2002); branch(0x10, 'wait')
emit(0xA9, 0x3F); abs_(0x8D, 0x2006); emit(0xA9, 0x00); abs_(0x8D, 0x2006)
emit(0xA5, 0x00); abs_(0x8D, 0x2007)            # palette[0] = color
emit(0xA9, 0x00); abs_(0x8D, 0x2006); abs_(0x8D, 0x2006)
emit(0xA9, 0x0A); abs_(0x8D, 0x2001)            # show background
emit(0xA9, 0x01); abs_(0x8D, 0x4016); emit(0xA9, 0x00); abs_(0x8D, 0x4016)
emit(0xA9, 0x21, 0x85, 0x00)     # default color each frame
abs_(0xAD, 0x4016); emit(0x29, 0x01)            # read A button
branch(0xF0, 'main')
emit(0xA9, 0x2A, 0x85, 0x00)     # A held: color = $2A (green)
jmp('main')
label('nmi'); emit(0x40)         # RTI

for kind, pos, target in fixups:
    t = labels[target]
    if kind == 'rel':
        off = t - (ORG + pos + 1)
        assert -128 <= off <= 127
        code[pos] = off & 0xFF
    else:
        code[pos], code[pos + 1] = t & 0xFF, t >> 8

prg = bytearray(code) + bytearray(0x4000 - len(code))
vec = labels['nmi'], labels['reset'], labels['nmi']
prg[0x3FFA:0x4000] = bytes(b for v in vec for b in (v & 0xFF, v >> 8))
header = b'NES\x1a' + bytes([1, 1, 0, 0]) + bytes(8)   # 16 KB PRG, 8 KB CHR, NROM
rom = header + prg + bytes(0x2000)
out = pathlib.Path(__file__).resolve().parent.parent / 'tests' / 'fixtures' / 'color-test.nes'
out.write_bytes(rom)
print(out, len(rom))
