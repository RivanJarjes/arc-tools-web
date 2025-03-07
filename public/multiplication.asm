    .begin
    .org 2048
prog:   ld [num1], %r1
        ld [num2], %r2
        clr %r3 

loop:   add %r1, %r3, %r3
        subcc %r2, 1, %r2
        bg loop
        st %r3, [res]
        halt

num1:   42
num2:   25
res:    0
    .end
