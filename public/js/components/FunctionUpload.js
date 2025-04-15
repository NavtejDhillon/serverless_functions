// FunctionUpload component
const FunctionUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();
  
  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setUploadError('');
    setUploadSuccess('');
  };
  
  // Handle click on upload area
  const handleUploadAreaClick = () => {
    fileInputRef.current.click();
  };
  
  // Handle drag over events
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };
  
  // Handle drag leave events
  const handleDragLeave = () => {
    setDragOver(false);
  };
  
  // Handle drop events
  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadError('');
      setUploadSuccess('');
    }
  };
  
  // Validate file
  const validateFile = (file) => {
    if (!file) {
      setUploadError('Please select a file to upload');
      return false;
    }
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.js') && !fileName.endsWith('.ts')) {
      setUploadError('Only .js and .ts files are allowed');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setUploadError('File size exceeds 5MB limit');
      return false;
    }
    
    return true;
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!validateFile(file)) {
      return;
    }
    
    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');
      
      const result = await API.functions.upload(file);
      
      setUploadSuccess(`Function "${result.function.name}" uploaded successfully`);
      setFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Redirect to functions list after 2 seconds
      setTimeout(() => {
        navigate('/functions');
      }, 2000);
    } catch (error) {
      setUploadError('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Upload Function</h2>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/functions')}
        >
          Back to Functions
        </button>
      </div>
      
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Upload a JavaScript or TypeScript Function</h5>
          
          {uploadError && (
            <div className="alert alert-danger" role="alert">
              {uploadError}
            </div>
          )}
          
          {uploadSuccess && (
            <div className="alert alert-success" role="alert">
              {uploadSuccess}
            </div>
          )}
          
          <div 
            className={`upload-area mb-3 ${dragOver ? 'drag-over' : ''}`}
            onClick={handleUploadAreaClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              className="d-none" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".js,.ts"
            />
            
            {file ? (
              <div>
                <div className="mb-2">Selected file:</div>
                <div className="d-flex align-items-center justify-content-center">
                  <span className="badge bg-primary me-2">{file.name.split('.').pop()}</span>
                  <strong>{file.name}</strong>
                  <span className="ms-2 text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            ) : (
              <div>
                <i className="bi bi-cloud-upload" style={{ fontSize: '2rem' }}></i>
                <p className="mt-2 mb-0">
                  Drag and drop a function file here, or click to browse
                </p>
                <small className="text-muted">
                  Accepts .js and .ts files (Max 5MB)
                </small>
              </div>
            )}
          </div>
          
          <div className="d-grid">
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Uploading...
                </>
              ) : (
                'Upload Function'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Function Guidelines</h5>
          <ul className="mb-0">
            <li>Functions should export a single function that accepts an input object.</li>
            <li>Function output should be returned as a value or resolved Promise.</li>
            <li>TypeScript files will be automatically compiled to JavaScript.</li>
            <li>Errors should be properly thrown for error handling.</li>
            <li>The function will be executed in a sandboxed environment.</li>
            <li>Example:
              <pre className="mt-2 p-3 bg-light rounded">
{`// example.js
module.exports = function(input) {
  // Process input
  console.log('Processing input:', input);
  
  // Return output
  return {
    message: 'Hello from serverless function!',
    timestamp: new Date().toISOString(),
    input: input
  };
};`}
              </pre>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 