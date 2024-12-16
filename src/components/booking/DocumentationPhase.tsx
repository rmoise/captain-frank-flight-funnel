'use client';

export const DocumentationPhase = () => {
  return (
    <section className="mt-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Upload Documents</h1>
          <p className="text-gray-600">
            Please provide the necessary documentation to support your claim.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Document upload sections */}
          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-semibold mb-4">Boarding Pass</h2>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">
                Drag and drop your boarding pass here, or click to select
              </p>
              <button className="px-4 py-2 bg-red-500 text-white rounded-lg">
                Upload File
              </button>
            </div>
          </div>

          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-semibold mb-4">Flight Ticket</h2>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">
                Drag and drop your flight ticket here, or click to select
              </p>
              <button className="px-4 py-2 bg-red-500 text-white rounded-lg">
                Upload File
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};