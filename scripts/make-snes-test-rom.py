#!/usr/bin/env python3
"""Builds tests/fixtures/color-test.sfc: an original 32 KB LoROM SNES test program (CC0).

The screen is blue; it turns green while the A button is held. Used by the
browser tests to prove the SNES core runs and receives input. Hand-assembled
65816 machine code, no third-party code or assets.
"""
from pathlib import Path

BLUE = (0x00, 0x7C)   # BGR555 0x7C00
GREEN = (0xE0, 0x03)  # BGR555 0x03E0


def set_color(lo, hi):
    return bytes([
        0xA9, 0x00, 0x8D, 0x21, 0x21,  # lda #0 ; sta $2121 (CGRAM address 0)
        0xA9, lo, 0x8D, 0x22, 0x21,    # lda #lo ; sta $2122
        0xA9, hi, 0x8D, 0x22, 0x21,    # lda #hi ; sta $2122
    ])


code = bytearray()
code += bytes([0x78, 0x18, 0xFB, 0xE2, 0x30])           # sei ; clc ; xce ; sep #$30
code += bytes([0xA9, 0x8F, 0x8D, 0x00, 0x21])           # forced blank
code += set_color(*BLUE)
code += bytes([0xA9, 0x0F, 0x8D, 0x00, 0x21])           # screen on, full brightness
code += bytes([0xA9, 0x01, 0x8D, 0x00, 0x42])           # auto joypad read on
loop = len(code)
code += bytes([0xAD, 0x12, 0x42, 0x10, 0xFB])           # wait for vblank: lda $4212 ; bpl -5
code += bytes([0xAD, 0x12, 0x42, 0x29, 0x01, 0xD0, 0xF9])  # wait for joypad read: lda $4212 ; and #1 ; bne -7
code += bytes([0xAD, 0x18, 0x42, 0x29, 0x80])           # lda $4218 ; and #$80 (A button)
green = set_color(*GREEN)
blue = set_color(*BLUE)
code += bytes([0xF0, len(green) + 2])                   # beq blue
code += green
code += bytes([0x80, len(blue)])                        # bra after
code += blue
code += bytes([0xAD, 0x12, 0x42, 0x30, 0xFB])           # wait for vblank to end: lda $4212 ; bmi -5
back = loop - (len(code) + 2)
code += bytes([0x80, back & 0xFF])                      # bra loop
rti = len(code)
code += bytes([0x40])                                   # rti (unused interrupt handlers)

rom = bytearray(0x8000)
rom[: len(code)] = code
h = 0x7FC0
title = b'KIDS ARCADE TEST'.ljust(21, b' ')
rom[h:h + 21] = title
rom[h + 0x15] = 0x20  # LoROM, slow
rom[h + 0x16] = 0x00  # ROM only
rom[h + 0x17] = 0x05  # 32 KB
rom[h + 0x18] = 0x00  # no save RAM
rom[h + 0x19] = 0x01  # region
rom[h + 0x1A] = 0x00
rom[h + 0x1B] = 0x00
rti_addr = 0x8000 + rti
for off in range(0x7FE4, 0x7FF0, 2):   # native vectors
    rom[off:off + 2] = rti_addr.to_bytes(2, 'little')
for off in range(0x7FF4, 0x7FFC, 2):   # emulation vectors
    rom[off:off + 2] = rti_addr.to_bytes(2, 'little')
rom[0x7FFC:0x7FFE] = (0x8000).to_bytes(2, 'little')  # reset
rom[0x7FFE:0x8000] = rti_addr.to_bytes(2, 'little')
# Checksum: complement + checksum always sum to 0x1FE in bytes, so compute with that placeholder.
rom[h + 0x1C:h + 0x20] = bytes([0xFF, 0xFF, 0x00, 0x00])
total = sum(rom) & 0xFFFF
rom[h + 0x1C:h + 0x1E] = (total ^ 0xFFFF).to_bytes(2, 'little')
rom[h + 0x1E:h + 0x20] = total.to_bytes(2, 'little')

out = Path(__file__).resolve().parent.parent / 'tests/fixtures/color-test.sfc'
out.write_bytes(bytes(rom))
print('wrote', out, len(rom), 'bytes, checksum', hex(total))
