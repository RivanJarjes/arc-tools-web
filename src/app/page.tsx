"use client";

import { binaryAddition, numberToOnesComplementBinary, numberToTwosComplementBinary } from "./utils/helpers";
import { useState } from "react";

export default function Home() {
  const [decimal, setDecimal] = useState(-10);
  const [decimal2, setDecimal2] = useState(0);
  const [bits, setBits] = useState(32);
  const OnesCompliment = numberToOnesComplementBinary(decimal, bits);
  const TwosCompliment = numberToTwosComplementBinary(decimal, bits);
  const OnesCompliment2 = numberToOnesComplementBinary(decimal2, bits);
  const TwosCompliment2 = numberToTwosComplementBinary(decimal2, bits);
  return (
    <div>
      <div>
        <label>First Decimal: </label>
        <input 
          type="number"
          value={decimal}
          onChange={(e) => setDecimal(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-black"
        />
      </div>
      <div>
        <label>Second Decimal: </label>
        <input 
          type="number"
          value={decimal2}
          onChange={(e) => setDecimal2(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-black"
        />
      </div>
      <div>
        <label>Number of Bits: </label>
        <input
          type="number"
          value={bits}
          onChange={(e) => setBits(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-black"
        />
      </div>
      <h1>First Decimal: {decimal ? decimal : "0"}</h1>
      <h1>1&apos;s Complement: {OnesCompliment.replace(/(.{4})/g, '$1 ').trim()}</h1>
      <h1>2&apos;s Complement: {TwosCompliment.replace(/(.{4})/g, '$1 ').trim()}</h1>
      
      <h1>Second Decimal: {decimal2 ? decimal2 : "0"}</h1>
      <h1>1&apos;s Complement: {OnesCompliment2.replace(/(.{4})/g, '$1 ').trim()}</h1>
      <h1>2&apos;s Complement: {TwosCompliment2.replace(/(.{4})/g, '$1 ').trim()}</h1>
      
      <h1>Bits: {bits}</h1>
      <h1>Addition: {binaryAddition(TwosCompliment, TwosCompliment2, bits)}</h1>
    </div>
  );
}
