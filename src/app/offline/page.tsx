export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F8F7FC] px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-semibold text-foreground mb-2">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          Reconnect to the internet and try again. Anything already open should keep working.
        </p>
      </div>
    </div>
  );
}