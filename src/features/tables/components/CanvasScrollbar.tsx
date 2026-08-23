"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface CanvasScrollbarProps {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    axis: "x" | "y";
    thumbLength?: number; // px, fixed short length
}

export function CanvasScrollbar({ scrollRef, axis, thumbLength = 60 }: CanvasScrollbarProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [trackSize, setTrackSize] = useState(0);
    const [thumbPos, setThumbPos] = useState(0);
    const [visible, setVisible] = useState(false);
    const dragRef = useRef<{ startPointer: number; startThumb: number } | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        function update() {
            const scrollSize = axis === "x" ? el!.scrollWidth : el!.scrollHeight;
            const clientSize = axis === "x" ? el!.clientWidth : el!.clientHeight;
            const scrollPos = axis === "x" ? el!.scrollLeft : el!.scrollTop;
            const canScroll = scrollSize > clientSize + 1;
            setVisible(canScroll);
            if (!canScroll) return;

            const ts = axis === "x" ? track!.clientWidth : track!.clientHeight;
            setTrackSize(ts);
            const maxScroll = scrollSize - clientSize;
            const maxThumbPos = ts - thumbLength;
            setThumbPos(maxScroll > 0 ? (scrollPos / maxScroll) * maxThumbPos : 0);
        }

        update();
        el.addEventListener("scroll", update);
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => {
            el.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, [scrollRef, axis, thumbLength]);

    function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { startPointer: axis === "x" ? e.clientX : e.clientY, startThumb: thumbPos };
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        if (!dragRef.current || !scrollRef.current) return;
        const delta = (axis === "x" ? e.clientX : e.clientY) - dragRef.current.startPointer;
        const maxThumbPos = trackSize - thumbLength;
        const nextThumbPos = Math.min(Math.max(dragRef.current.startThumb + delta, 0), maxThumbPos);
        const el = scrollRef.current;
        const scrollSize = axis === "x" ? el.scrollWidth : el.scrollHeight;
        const clientSize = axis === "x" ? el.clientWidth : el.clientHeight;
        const maxScroll = scrollSize - clientSize;
        const ratio = maxThumbPos > 0 ? nextThumbPos / maxThumbPos : 0;
        if (axis === "x") el.scrollLeft = ratio * maxScroll;
        else el.scrollTop = ratio * maxScroll;
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        dragRef.current = null;
    }

    if (!visible) return null;

    return (
        <div
            ref={trackRef}
            className={axis === "x" ? "absolute left-0 right-0 bottom-1 h-1.5 flex justify-center" : "absolute top-0 bottom-0 right-1 w-1.5 flex justify-center"}
        >
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute bg-border hover:bg-muted-foreground rounded-full cursor-pointer touch-none"
                style={
                    axis === "x"
                        ? { left: thumbPos, width: thumbLength, height: 6, top: 0 }
                        : { top: thumbPos, height: thumbLength, width: 6, left: 0 }
                }
            />
        </div>
    );
}