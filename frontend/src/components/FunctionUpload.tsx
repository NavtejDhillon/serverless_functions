import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProcessOutput {
  compilation?: {
    success: boolean;
    output?: string;
    error?: string;
  };
  dependencyInstallation?: {
    success: boolean;
    dependencies: Record<string, string>;
    output?: string;
    error?: string;
  };
}

const FunctionUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [processOutput, setProcessOutput] = useState<ProcessOutput | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'js' && fileExtension !== 'ts') {
        setError('Only .js and .ts files are allowed');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
      setProcessOutput(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setIsUploading(true);
    setError('');
    setProcessOutput(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/functions/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Important for auth
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Upload failed');
      }
      
      // Handle successful upload with process output
      if (data.process) {
        setProcessOutput(data.process);
      }
      
      // Redirect after a delay to show process output
      setTimeout(() => {
        navigate('/functions');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4">Upload Function</h1>
      
      <div className="card">
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="functionFile" className="form-label">
                Select JavaScript or TypeScript file
              </label>
              <input
                type="file"
                className="form-control"
                id="functionFile"
                accept=".js,.ts"
                onChange={handleFileChange}
                required
              />
              <div className="form-text">
                Only .js and .ts files are allowed. TypeScript files will be compiled automatically.
                Dependencies will be automatically detected and installed.
              </div>
            </div>
            
            {file && (
              <div className="mb-3">
                <div className="card bg-light">
                  <div className="card-body">
                    <h5 className="card-title">Selected File</h5>
                    <p className="card-text mb-0">
                      <strong>Name:</strong> {file.name}
                    </p>
                    <p className="card-text mb-0">
                      <strong>Size:</strong> {Math.round(file.size / 1024)} KB
                    </p>
                    <p className="card-text">
                      <strong>Type:</strong> {file.type || 'application/javascript'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {processOutput && (
              <div className="mb-3">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Processing Results</h5>
                  </div>
                  <div className="card-body">
                    {processOutput.compilation && (
                      <div className="mb-3">
                        <h6>Compilation:</h6>
                        <div className={`alert ${processOutput.compilation.success ? 'alert-success' : 'alert-danger'}`}>
                          {processOutput.compilation.success ? 'Compilation successful' : 'Compilation failed'}
                          {processOutput.compilation.output && (
                            <pre className="mt-2 mb-0">{processOutput.compilation.output}</pre>
                          )}
                          {processOutput.compilation.error && (
                            <pre className="mt-2 mb-0 text-danger">{processOutput.compilation.error}</pre>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {processOutput.dependencyInstallation && (
                      <div className="mb-3">
                        <h6>Dependency Installation:</h6>
                        <div className={`alert ${processOutput.dependencyInstallation.success ? 'alert-success' : 'alert-warning'}`}>
                          {processOutput.dependencyInstallation.success ? 'Dependencies installed successfully' : 'Dependency installation issues'}
                          
                          {Object.keys(processOutput.dependencyInstallation.dependencies).length > 0 ? (
                            <div className="mt-2">
                              <strong>Detected Dependencies:</strong>
                              <ul className="mb-2">
                                {Object.entries(processOutput.dependencyInstallation.dependencies).map(([pkg, version]) => (
                                  <li key={pkg}>{pkg}: {version}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mb-0">No dependencies detected</p>
                          )}
                          
                          {processOutput.dependencyInstallation.output && (
                            <div>
                              <strong>Output:</strong>
                              <pre className="mt-1 mb-0" style={{ maxHeight: '200px', overflow: 'auto' }}>
                                {processOutput.dependencyInstallation.output}
                              </pre>
                            </div>
                          )}
                          
                          {processOutput.dependencyInstallation.error && (
                            <div>
                              <strong>Error:</strong>
                              <pre className="mt-1 mb-0 text-danger">
                                {processOutput.dependencyInstallation.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!file || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Function'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FunctionUpload; 