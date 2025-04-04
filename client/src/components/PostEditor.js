// Import necessary modules and components
import { createPost } from "../api/posts"; // Adjust the path based on your project structure
import {
  Button,
  Card,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  LinearProgress,
  Box,
  Snackbar,
} from "@mui/material";
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ErrorAlert from "./ErrorAlert";
import { isLoggedIn } from "../helpers/authHelper";
import HorizontalStack from "./util/HorizontalStack";
import UserAvatar from "./UserAvatar";
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import CloseIcon from '@mui/icons-material/Close';
import { useDropzone } from 'react-dropzone'; // For drag-and-drop functionality

// Define constants for maximum file size and autosave interval
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // Convert MB to Bytes
const AUTOSAVE_INTERVAL_MS = 5000; // Autosave every 5 seconds

const PostEditor = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [loading, setLoading] = useState(false); // Loading state during form submission
  const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress percentage
  const [uploadComplete, setUploadComplete] = useState(false); // Flag to indicate upload completion
  const [formData, setFormData] = useState({
    title: "",
    content: "", // Now using plain text
    country: "",
    state: "",
    city: "",
    area: "",
    mediaFiles: [],
    mediaPreviews: [], // Holds file previews with type and previewUrl
    mediaError: "",
  });
  const [serverError, setServerError] = useState(""); // Server-side error messages
  const [errors, setErrors] = useState({}); // Client-side validation errors
  const [draftSaved, setDraftSaved] = useState(false); // For autosave notification
  const user = isLoggedIn(); // Check if the user is logged in

  /**
   * Load draft from localStorage on component mount
   */
  useEffect(() => {
    const savedDraft = localStorage.getItem('postEditorDraft');
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
  }, []);

  /**
   * Autosave draft to localStorage at regular intervals
   */
  useEffect(() => {
    const autosave = setInterval(() => {
      localStorage.setItem('postEditorDraft', JSON.stringify(formData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000); // Hide notification after 2 seconds
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(autosave); // Cleanup on unmount
  }, [formData]);

  /**
   * Handle changes in media file input
   * @param {Event} e - The change event from the file input
   */
  const handleMediaChange = (e) => {
    const files = e.target.files;
    // Update state with selected media files
    setFormData((prevData) => ({
      ...prevData,
      mediaFiles: Array.from(files),
    }));
  };

  /**
   * Validate form data
   * @param {Object} data - The current form data
   * @returns {Object} errors - An object containing validation error messages
   */
  const validate = (data) => {
    const errors = {};
    if (!data.title) {
      errors.title = "Title is required";
    } else if (data.title.length > 80) {
      errors.title = "Title should not exceed 80 characters";
    }
    if (!data.content.trim()) { // Check for empty content
      errors.content = "Content is required";
    }
    if (!data.country) {
      errors.country = "Country is required";
    }

    return errors;
  };

  /**
   * Handle changes in text fields
   * @param {Event} e - The change event from the input fields
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      setErrors(validate(updatedData));
      return updatedData;
    });
  }, []);

  /**
   * Handle changes in the content text field
   * @param {Event} e - The change event from the input field
   */
  const handleContentChange = (e) => {
    const value = e.target.value;
    setFormData((prevData) => {
      const updatedData = { ...prevData, content: value };
      setErrors(validate(updatedData));
      return updatedData;
    });
  };

  /**
   * Handle media file additions via drag-and-drop or file input
   * @param {Array} acceptedFiles - An array of accepted File objects
   */
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(file => {
      // Check for file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFormData((prevData) => ({
          ...prevData,
          mediaError: `File ${file.name} exceeds ${MAX_FILE_SIZE_MB} MB.`,
        }));
        return;
      }

      // Check for maximum number of files
      if (formData.mediaFiles.length >= 3) {
        setFormData((prevData) => ({
          ...prevData,
          mediaError: "You can upload a maximum of 3 files.",
        }));
        return;
      }

      // Generate a preview URL for the file
      const previewUrl = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' :
                   file.type.startsWith('audio') ? 'audio' : 'image';

      // Update state with the new file and its preview
      setFormData((prevData) => ({
        ...prevData,
        mediaFiles: [...prevData.mediaFiles, file],
        mediaPreviews: [...prevData.mediaPreviews, { file, previewUrl, type }],
        mediaError: "",
      }));
    });
  }, [formData.mediaFiles]);

  // Initialize react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: 'image/*,video/*,audio/*' });

  /**
   * Handle removal of a media file
   * @param {number} index - The index of the media file to remove
   */
  const handleRemoveMedia = (index) => {
    setFormData((prevData) => {
      const updatedPreviews = prevData.mediaPreviews.filter((_, i) => i !== index);
      const updatedFiles = prevData.mediaFiles.filter((_, i) => i !== index);
      return {
        ...prevData,
        mediaFiles: updatedFiles,
        mediaPreviews: updatedPreviews,
        mediaError: "",
      };
    });
    setUploadProgress(0);
    setUploadComplete(false);
  };

  /**
   * Handle form submission
   * @param {Event} e - The submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    // Upload media files and get their URLs
    const mediaUrls = await uploadMediaFiles(formData.mediaFiles);

    // Create post with form data and media URLs
    const data = await createPost({
      ...formData,
      mediaUrls
    }, user);

    setLoading(false);

    if (data && data.error) {
      setServerError(data.error);
    } else {
      // Clear draft from localStorage upon successful submission
      localStorage.removeItem('postEditorDraft');
      const editedParam = data.edited ? "true" : "false";
      navigate(`/posts/${data.slug}/${data._id}?edited=${editedParam}`);
    }
  };

  /**
   * Upload media files to the server and return their URLs
   * @param {Array} files - An array of File objects to upload
   * @returns {Array} mediaUrls - An array of uploaded media URLs
   */
  const uploadMediaFiles = async (files) => {
    const mediaUrls = [];
    const formDataObj = new FormData();

    formDataObj.append("username", user.username); // Append username to form data

    files.forEach(file => {
      formDataObj.append("media[]", file); // Append each file
    });

    try {
      const response = await axios.post('https://media.sraws.com/upload.php', formDataObj, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data && response.data.length > 0) {
        response.data.forEach(item => {
          if (item.url) {
            mediaUrls.push(item.url);
          } else if (item.error) {
            console.error("Upload error:", item.error);
          }
        });
      }
    } catch (error) {
      console.error("Error uploading media:", error);
    }
    setUploadComplete(true);
    return mediaUrls;
  };

  /**
   * Fetch user's geolocation on component mount
   */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  /**
   * Callback on successful geolocation
   * @param {Position} position - The geolocation position object
   */
  const showPosition = async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      // Fetch location data based on latitude and longitude
      const locationInfo = await fetchLocation(lat, lon);

      // Update form data with fetched location details
      setFormData((prevData) => ({
        ...prevData,
        country: locationInfo.country,
        state: locationInfo.state,
        city: locationInfo.city,
      }));
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  /**
   * Callback on geolocation error
   * @param {PositionError} error - The geolocation error object
   */
  const showError = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error("User denied the request for Geolocation.");
        break;
      case error.POSITION_UNAVAILABLE:
        console.error("Location information is unavailable.");
        break;
      case error.TIMEOUT:
        console.error("The request to get user location timed out.");
        break;
      case error.UNKNOWN_ERROR:
        console.error("An unknown error occurred.");
        break;
      default:
        console.error("An unknown error occurred.");
        break;
    }
  };

  /**
   * Mock API function to fetch location data based on latitude and longitude
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} locationInfo - An object containing country, state, and city
   */
  const fetchLocation = async (lat, lon) => {
    // Mock API endpoint to fetch location data based on lat and lon
    const response = await fetch(`https://api.sraws.com/geolocation?lat=${lat}&lon=${lon}`);
    if (!response.ok) {
      throw new Error('Failed to fetch location data.');
    }
    return await response.json();
  };

  return (
    <Card>
      <Stack spacing={2} sx={{ p: 2 }}>
        {/* Display user information if logged in */}
        {user && (
          <HorizontalStack spacing={2}>
            <UserAvatar width={50} height={50} username={user.username} />
            <Typography variant="h5">
              What would you like to report today, {user.username}?
            </Typography>
          </HorizontalStack>
        )}
        {/* Form for creating a post */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Title Field */}
          <TextField
            fullWidth
            label="Title"
            required
            name="title"
            margin="normal"
            onChange={handleChange}
            value={formData.title}
            error={Boolean(errors.title)}
            helperText={errors.title}
          />
          {/* Content Field */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Report Description:
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            name="content"
            value={formData.content}
            onChange={handleContentChange}
            placeholder="Write your report here..."
            error={Boolean(errors.content)}
            helperText={errors.content}
            variant="outlined"
            sx={{ mt: 1 }}
          />
          {/* Location Fields */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Enter Report Incident Area:
          </Typography>
          <TextField
            fullWidth
            label="Country"
            required
            name="country"
            margin="normal"
            onChange={handleChange}
            value={formData.country}
            error={Boolean(errors.country)}
            helperText={errors.country}
          />
          <TextField
            fullWidth
            label="State"
            name="state"
            margin="normal"
            onChange={handleChange}
            value={formData.state}
            error={Boolean(errors.state)}
            helperText={errors.state}
          />
          <TextField
            fullWidth
            label="City"
            name="city"
            margin="normal"
            onChange={handleChange}
            value={formData.city}
            error={Boolean(errors.city)}
            helperText={errors.city}
          />
          <TextField
            fullWidth
            label="Area"
            name="area"
            margin="normal"
            onChange={handleChange}
            value={formData.area}
            error={Boolean(errors.area)}
            helperText={errors.area}
          />

          {/* Display media upload errors */}
          {formData.mediaError && (
            <Typography variant="body2" color="error" gutterBottom>
              {formData.mediaError}
            </Typography>
          )}

          {/* Drag-and-Drop Area for Media Upload */}
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed #3f51b5',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: isDragActive ? '#3f51b5' : '#cccccc',
              cursor: 'pointer',
              mt: 2,
            }}
          >
            <input {...getInputProps()} />
            {
              isDragActive ?
                <Typography>Drop the files here...</Typography> :
                <Typography>Drag 'n' drop some media files here, or click to select files</Typography>
            }
          </Box>

          {/* Existing Media Previews */}
          {formData.mediaPreviews.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Stack direction="row" spacing={2}>
                {formData.mediaPreviews.map((media, index) => (
                  <Box key={index} sx={{ position: 'relative', maxWidth: '100%', maxHeight: '300px', mb: 2 }}>
                    {/* Display image preview */}
                    {media.type === 'image' && (
                      <img
                        src={media.previewUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    )}
                    {/* Display video preview */}
                    {media.type === 'video' && (
                      <video controls style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}>
                        <source src={media.previewUrl} />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {/* Display audio preview */}
                    {media.type === 'audio' && (
                      <audio controls style={{ width: '100%', borderRadius: '8px' }}>
                        <source src={media.previewUrl} />
                        Your browser does not support the audio tag.
                      </audio>
                    )}
                    {/* Button to remove media */}
                    <IconButton
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
                      onClick={() => handleRemoveMedia(index)}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Upload Media Button */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Upload the Evidence
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<InsertPhotoIcon />}
            disabled={loading}
            sx={{ mt: 2 }}
          >
            Add Media
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              hidden
              onChange={handleMediaChange}
            />
          </Button>

          {/* Display Upload Progress */}
          {loading && (
            <Box sx={{ width: '100%', mt: 2, position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: '4px',
                    backgroundColor: '#3f51b5',
                  },
                }}
              />
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontWeight: 'bold',
                }}
              >
                {`${uploadProgress}%`}
              </Typography>
              {uploadComplete && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 'bold',
                    mt: 2,
                  }}
                >
                  Upload complete!
                </Typography>
              )}
            </Box>
          )}

          {/* Display server-side errors */}
          {serverError && <ErrorAlert message={serverError} />}

          {/* Submit Button */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Post
          </Button>
        </Box>
      </Stack>

      {/* Snackbar for Autosave Notification */}
      <Snackbar
        open={draftSaved}
        message="Draft autosaved"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
  );
};

export default PostEditor;