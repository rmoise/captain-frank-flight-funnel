export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        <h1 className="text-3xl font-bold mb-8">Contact Support</h1>
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    </div>
  );
}