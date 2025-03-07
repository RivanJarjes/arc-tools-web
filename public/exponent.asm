    .begin
    .org 2048
prog:   ld      [base], %r1  ! Load the current base @ r1
        ld      [exp], %r3  ! Load the current exponent @ r3

loop1:  ld      [base], %r2  ! Load the original base at r2 at loop for multiplication
        subcc   %r3, 1, %r3  ! Subtract one from the current exponent
        andcc   %r3, %r3, %r0  ! If r3 is 0...
        be      done  ! Branch to done

loop2:  add     %r1, %r4, %r4 ! Keep adding integer at r4 until meets multiplication goal
        subcc   %r2, 1, %r2
        bg      loop2  ! Keep adding the current base until its multiplied by original base
        mov     %r4, %r1  ! Becomes new base (ex. 4 * 4 * 4 becomes 16 * 4 and so on)
        mov     %r0, %r4  ! Empty out register for next loop
        ba      loop1  ! Branch back to loop 1

done:   st      %r1, [res]  ! Store answer at r1
        halt

base:   4
exp:    7
res:    0  
    .end
