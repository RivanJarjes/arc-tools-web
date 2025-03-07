    .begin
    .org 2048
prog:   ld      [x], %r1  ! Store the dividend at r1
        ld      [y], %r2  ! Store the divisor at r2

loop:   cmp     %r1, %r2  ! Compare the current dividend and divisor
        bl      done  ! If the dividend is lower, branch to done, otherwise keep going
        subcc   %r1, %r2, %r1  ! Subtract the dividend from the current divisor
        addcc   %r3, 1, %r3  !  Add to the current quotient
        ba      loop  !  Repeat Loop
    
done:   st      %r3, [quot]  !  Store the amount of times we subtracted at quot
        st      %r1, [rem]  !  Store whatever is left at rem
        halt

x:      8
y:      3
quot:   0
rem:    0

    .end
