import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FunctionUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
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
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/functions/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Upload failed');
      }
      
      // Redirect to functions list
      navigate('/functions');
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