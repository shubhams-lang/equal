import React, { useState, useEffect, useContext, useCallback } from "react";
import { ChatContext } from "../../context/ChatContext";

const WORDS_NORMAL = [
  "ROCKET","BATTLE","PYTHON","CHROME","SERVER",
  "MOBILE","HIDDEN","STRIKE","MASTER","BINARY"
];

const WORDS_HARD = [
  "CYBERNETIC","ALGORITHM","FRAMEWORK",
  "BLOCKCHAIN","ENCRYPTION","JAVASCRIPT","DATABASE"
];

export default function WordScramble() {

  const {
    socket,
    roomId,
    username,
    opponent,
    updateScore,
    scores,
    recordMatchWin,
    settings,
    sendRematchRequest,
    closeGame
  } = useContext(ChatContext);

  const WIN_TARGET = settings?.winTarget || 10;

  const isHost = opponent ? username < opponent : true;

  const [targetWord,setTargetWord] = useState("");
  const [scrambled,setScrambled] = useState("");
  const [input,setInput] = useState("");

  const [timeLeft,setTimeLeft] = useState(15);
  const [revealedIndices,setRevealedIndices] = useState([]);

  const [streak,setStreak] = useState(0);

  const [matchWinner,setMatchWinner] = useState(null);
  const [showAchievement,setShowAchievement] = useState(false);



  // ----------- SCRAMBLE WORD -----------
  const scrambleWord = (word)=>{
    if(word.length <= 1) return word;

    let result = word;

    while(result === word){
      result = word
        .split("")
        .sort(()=>Math.random()-0.5)
        .join("");
    }

    return result;
  };



  // ----------- GENERATE WORD -----------
  const generateNewWord = useCallback(()=>{

    if(!isHost) return;

    const currentMax = Math.max(
      scores[username] || 0,
      scores[opponent] || 0
    );

    const pool =
      currentMax >= Math.floor(WIN_TARGET * 0.7)
        ? WORDS_HARD
        : WORDS_NORMAL;

    const word = pool[Math.floor(Math.random()*pool.length)];

    const scrambledWord = scrambleWord(word);

    setTargetWord(word);
    setScrambled(scrambledWord);
    setInput("");
    setRevealedIndices([]);
    setTimeLeft(15);

    socket.emit("game-data",{
      roomId,
      type:"SCRAMBLE_NEXT",
      word,
      scrambled:scrambledWord
    });

  },[
    isHost,
    scores,
    username,
    opponent,
    socket,
    roomId,
    WIN_TARGET
  ]);



  // ----------- TIMER -----------
  useEffect(()=>{

    if(!isHost || matchWinner) return;

    const timer = setInterval(()=>{

      setTimeLeft(prev=>{

        if(prev <= 1){

          generateNewWord();

          socket.emit("game-data",{
            roomId,
            type:"TIMER_RESET"
          });

          return 15;
        }

        return prev - 1;

      });

    },1000);

    return ()=>clearInterval(timer);

  },[isHost,matchWinner,generateNewWord,socket,roomId]);



  // ----------- SOCKET EVENTS -----------
  useEffect(()=>{

    const handleData = (data)=>{

      switch(data.type){

        case "SCRAMBLE_NEXT":

          setTargetWord(data.word);
          setScrambled(data.scrambled);
          setInput("");
          setRevealedIndices([]);
          setTimeLeft(15);

          break;



        case "HINT_REVEALED":

          setRevealedIndices(prev=>[
            ...prev,
            data.index
          ]);

          setTimeLeft(data.newTime);

          break;



        case "TIMER_RESET":

          setTimeLeft(15);
          setStreak(0);

          break;



        case "REQUEST_HINT":

          if(isHost) applyHint();

          break;



        case "REQUEST_NEW_WORD":

          if(isHost) generateNewWord();

          break;



        case "MATCH_OVER":

          setMatchWinner(data.winner);

          break;



        case "ACHIEVEMENT_UNLOCKED":

          setShowAchievement(true);

          break;



        case "GAME_RESTART_SIGNAL":

          setMatchWinner(null);
          setShowAchievement(false);
          setStreak(0);

          if(isHost) generateNewWord();

          break;

        default:
          break;
      }

    };

    socket.on("game-data",handleData);

    return ()=>socket.off("game-data",handleData);

  },[socket,isHost,generateNewWord]);



  // ----------- INITIAL START -----------
  useEffect(()=>{

    if(isHost && !targetWord){
      generateNewWord();
    }

  },[isHost,targetWord,generateNewWord]);



  // ----------- HINT LOGIC -----------
  const applyHint = ()=>{

    if(!isHost) return;
    if(timeLeft <= 3) return;

    const available = targetWord
      .split("")
      .map((_,i)=>i)
      .filter(i=>!revealedIndices.includes(i));

    if(available.length <= 1) return;

    const newIdx =
      available[Math.floor(Math.random()*available.length)];

    const newTime = Math.max(0,timeLeft - 3);

    socket.emit("game-data",{
      roomId,
      type:"HINT_REVEALED",
      index:newIdx,
      newTime
    });

    setRevealedIndices(prev=>[...prev,newIdx]);
    setTimeLeft(newTime);

  };



  const handleRequestHint = ()=>{

    if(matchWinner) return;

    if(revealedIndices.length >= targetWord.length - 1)
      return;

    if(isHost) applyHint();
    else{
      socket.emit("game-data",{
        roomId,
        type:"REQUEST_HINT"
      });
    }

  };



  // ----------- INPUT -----------
  const handleInput = (value)=>{

    if(matchWinner) return;

    const entry = value
      .toUpperCase()
      .replace(/[^A-Z]/g,"");

    setInput(entry);

    if(entry === targetWord && targetWord){

      const newStreak = streak + 1;

      setStreak(newStreak);

      const points =
        newStreak >= 3 ? 2 : 1;

      for(let i=0;i<points;i++){
        updateScore(username);
      }

      const myScore =
        (scores[username] || 0) + points;

      if(myScore >= WIN_TARGET){

        setMatchWinner(username);

        recordMatchWin(username);

        socket.emit("game-data",{
          roomId,
          type:"MATCH_OVER",
          winner:username
        });

        if((scores[opponent] || 0) === 0){

          socket.emit("game-data",{
            roomId,
            type:"ACHIEVEMENT_UNLOCKED"
          });

          setShowAchievement(true);

        }

      }
      else{

        if(isHost) generateNewWord();
        else{

          socket.emit("game-data",{
            roomId,
            type:"REQUEST_NEW_WORD"
          });

        }

      }

    }

  };



  // ----------- UI -----------
  return (

  <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">

    {/* SCORE BAR */}

    <div className="absolute top-6 w-full max-w-[320px] px-4 space-y-2">

      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">

        <span className="text-[#2481cc]">
          YOU: {scores[username] || 0}
          {streak >= 3 && " 🔥"}
        </span>

        <span className="text-red-500">
          {opponent?.slice(0,8) || "WAITING"}:
          {scores[opponent] || 0}
        </span>

      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden">

        <div
          className="bg-[#2481cc]"
          style={{
            width:`${((scores[username] || 0)/WIN_TARGET)*100}%`
          }}
        />

        <div
          className="bg-red-500/30 ml-auto"
          style={{
            width:`${((scores[opponent] || 0)/WIN_TARGET)*100}%`
          }}
        />

      </div>

    </div>



    {/* TIMER */}

    <div className="absolute top-20 w-full max-w-[180px] text-center">

      <div className={`text-xs font-black mb-1
        ${timeLeft <= 5 ? "text-red-500 animate-pulse":"text-white/40"}
      `}>
        {timeLeft}s
      </div>

      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">

        <div
          className={`h-full ${timeLeft <= 5 ? "bg-red-500":"bg-blue-500"}`}
          style={{width:`${(timeLeft/15)*100}%`}}
        />

      </div>

    </div>



    {/* SCRAMBLED WORD */}

    <div className="flex flex-wrap gap-2 justify-center mb-6 min-h-[60px]">

      {scrambled
        ? scrambled.split("").map((c,i)=>(
          <div key={i}
          className="w-10 h-14 bg-white/10 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-black text-white">{c}</span>
          </div>
        ))
        : (
          <div className="text-blue-400 text-xs animate-pulse">
            LOADING SCRAMBLE...
          </div>
        )
      }

    </div>



    {/* INPUT */}

    <input
      autoFocus
      value={input}
      disabled={!!matchWinner}
      onChange={(e)=>handleInput(e.target.value)}
      placeholder="UNSCRAMBLE..."
      className="w-full max-w-xs bg-black/40 border border-white/10 rounded-2xl p-5 text-center text-2xl font-black text-white outline-none"
    />



    {/* HINT BUTTON */}

    <button
      onClick={handleRequestHint}
      disabled={
        matchWinner ||
        timeLeft <= 3 ||
        revealedIndices.length >= targetWord.length - 1
      }
      className="mt-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-yellow-500 text-xs font-black uppercase"
    >
      💡 Hint (-3s)
    </button>



    {/* WINNER OVERLAY */}

    {matchWinner && (

      <div className="absolute inset-0 bg-[#0e1621]/95 flex flex-col items-center justify-center">

        <h2 className="text-4xl font-black text-white mb-6">
          {matchWinner === username
            ? "VICTORY"
            : "DEFEAT"}
        </h2>

        <div className="flex flex-col gap-3 w-[200px]">

          <button
            onClick={sendRematchRequest}
            className="bg-[#2481cc] py-3 rounded-xl text-xs font-black uppercase text-white"
          >
            Play Again
          </button>

          <button
            onClick={closeGame}
            className="bg-white/5 py-3 rounded-xl text-xs font-black text-gray-400"
          >
            Quit
          </button>

        </div>

      </div>

    )}

  </div>
  );
}