export default function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
      <div className="spinner-lg" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
