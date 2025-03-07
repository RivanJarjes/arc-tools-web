.begin
.org 2048

prog1:    ld    [x], %r1
    ld    [x+4], %r2
    addcc    %r1, %r2, %r2	! -1 + 2 = 1
    ld    [x+8], %r1
    addcc    %r1, %r2, %r2	! 1 + -3 = -2
    ld    [x+12], %r1
    addcc    %r1, %r2, %r2	! -2 + 4 = 2
    ld    [x+16], %r1
    addcc    %r1, %r2, %r2	! 2 + -5 = -3
    st    %r2, [2240]		! should result in -3 being stored in register 2 
    halt

.org    2200
x:      -1
        2
        -3
        4
        -5

.end
 
