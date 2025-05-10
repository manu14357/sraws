import { createPost } from "../api/posts";
import {
  Button,
  Card,
  Stack,
  TextField,
  Typography,
  IconButton,
  LinearProgress,
  Box,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  Tooltip,
  Grid,
  Paper,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ErrorAlert from "./ErrorAlert";
import { isLoggedIn } from "../helpers/authHelper";
import HorizontalStack from "./util/HorizontalStack";
import UserAvatar from "./UserAvatar";
import {
  InsertPhoto,
  Close,
  Article,
  SmartToy,
  Save,
  Link,
  LocationOn,
  Title,
  Description,
  CloudUpload,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const AUTOSAVE_INTERVAL_MS = 5000;
const AI_PROCESSING_TIMEOUT = 30000;

const PostEditor = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    country: "",
    state: "",
    city: "",
    area: "",
    mediaFiles: [],
    mediaPreviews: [],
    mediaError: "",
  });
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [contentSuggestions, setContentSuggestions] = useState([]);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [extractedMetadata, setExtractedMetadata] = useState(null);
  const [streamedContent, setStreamedContent] = useState("");
  const user = isLoggedIn();

  // Load draft from localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem("postEditorDraft");
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    const autosave = setInterval(() => {
      localStorage.setItem("postEditorDraft", JSON.stringify(formData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(autosave);
  }, [formData]);

  // Form validation
  const validate = (data) => {
    const errors = {};
    if (!data.title) {
      errors.title = "Title is required";
    } else if (data.title.length > 80) {
      errors.title = "Title should not exceed 80 characters";
    }
    if (!data.content.trim()) {
      errors.content = "Content is required";
    }
    if (!data.country) {
      errors.country = "Country is required";
    }
    return errors;
  };

  // Handle text field changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      setErrors(validate(updatedData));
      return updatedData;
    });
  }, []);

  // Handle content changes
  const handleContentChange = (e) => {
    const value = e.target.value;
    setFormData((prevData) => {
      const updatedData = { ...prevData, content: value };
      setErrors(validate(updatedData));
      return updatedData;
    });
  };

  // Handle media file drops
  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setFormData((prevData) => ({
            ...prevData,
            mediaError: `File ${file.name} exceeds ${MAX_FILE_SIZE_MB} MB.`,
          }));
          return;
        }

        if (formData.mediaFiles.length >= 3) {
          setFormData((prevData) => ({
            ...prevData,
            mediaError: "You can upload a maximum of 3 files.",
          }));
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        const type = file.type.startsWith("video")
          ? "video"
          : file.type.startsWith("audio")
          ? "audio"
          : "image";

        setFormData((prevData) => ({
          ...prevData,
          mediaFiles: [...prevData.mediaFiles, file],
          mediaPreviews: [...prevData.mediaPreviews, { file, previewUrl, type }],
          mediaError: "",
        }));
      });
    },
    [formData.mediaFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "image/*,video/*,audio/*",
  });

  // Remove media file
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

  // Upload media files to Firebase
  const uploadMediaFiles = async (files) => {
    const mediaUrls = [];

    if (!files || files.length === 0) {
      setUploadComplete(true);
      return mediaUrls;
    }

    try {
      const uploadPromises = files.map((file) => {
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const fileExtension = file.name.split(".").pop();
        const uniqueFileName = `${file.name.split(".")[0]}_${uniqueId}.${fileExtension}`;
        const username = user && user.username ? user.username : "anonymous";
        const filePath = `media/${username}/${uniqueFileName}`;

        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const percentCompleted = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setUploadProgress(percentCompleted);
            },
            (error) => {
              console.error("Error uploading file:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      });

      mediaUrls.push(...(await Promise.all(uploadPromises)));
    } catch (error) {
      console.error("Error uploading media to Firebase:", error);
    }

    setUploadComplete(true);
    return mediaUrls;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    const mediaUrls = await uploadMediaFiles(formData.mediaFiles);

    const data = await createPost(
      {
        ...formData,
        mediaUrls,
      },
      user
    );

    setLoading(false);

    if (data && data.error) {
      setServerError(data.error);
    } else {
      localStorage.removeItem("postEditorDraft");
      const editedParam = data.edited ? "true" : "false";
      navigate(`/posts/${data.slug}/${data._id}?edited=${editedParam}`);
    }
  };

  // Open AI dialog
  const handleOpenAiDialog = () => {
    setAiDialogOpen(true);
    setAiUrl("");
    setAiError("");
    setExtractedMetadata(null);
    setStreamedContent("");
  };

  // Close AI dialog
  const handleCloseAiDialog = () => {
    setAiDialogOpen(false);
    setAiProcessing(false);
    setAiError("");
    setStreamedContent("");
  };

  // Process URL with NVIDIA AI
  const handleAiProcess = async () => {
    if (!aiUrl) {
      setAiError("Please enter a valid URL");
      return;
    }

    console.log('Sending request to /api/analyze-url with URL:', aiUrl);
    setAiProcessing(true);
    setAiError("");
    setStreamedContent("");

    try {
      const response = await fetch('https://api.sraws.com/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiUrl }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to analyze URL: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setExtractedMetadata(data);
      generateSuggestions(data);
    } catch (error) {
      console.error('AI processing error:', error);
      setAiError(error.message || "Failed to process URL with AI");
    } finally {
      setAiProcessing(false);
    }
  };

  // Generate suggestions from AI results
  const generateSuggestions = (metadata) => {
    // Title suggestions
    setTitleSuggestions([
      metadata.title,
      `Breaking: ${metadata.title}`,
      `Urgent: ${metadata.title}`,
      `Incident Report: ${metadata.title.substring(0, 30)}...`,
    ]);

    // Content suggestions
    setContentSuggestions([
      metadata.content,
      `Summary: ${metadata.content.substring(0, 200)}...`,
      `Detailed report: ${metadata.content}`,
    ]);

    // Location suggestions
    if (metadata.location) {
      setLocationSuggestions([
        `${metadata.location.city}, ${metadata.location.state}, ${metadata.location.country}`,
        `${metadata.location.area}, ${metadata.location.city}`,
        `${metadata.location.city} City Center`,
      ]);
    }
  };

  // Apply AI suggestions to form
  const applyAiSuggestions = () => {
    if (!extractedMetadata) return;

    setFormData({
      title: extractedMetadata.title,
      content: extractedMetadata.content,
      country: extractedMetadata.location?.country || "",
      state: extractedMetadata.location?.state || "",
      city: extractedMetadata.location?.city || "",
      area: extractedMetadata.location?.area || "",
      mediaFiles: [],
      mediaPreviews: [],
      mediaError: "",
    });

    setActiveTab("manual");
    setAiDialogOpen(false);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Apply title suggestion
  const applyTitleSuggestion = (suggestion) => {
    setFormData((prev) => ({ ...prev, title: suggestion }));
  };

  // Apply content suggestion
  const applyContentSuggestion = (suggestion) => {
    setFormData((prev) => ({ ...prev, content: suggestion }));
  };

  // Apply location suggestion
  const applyLocationSuggestion = (suggestion) => {
    const parts = suggestion.split(",").map((part) => part.trim());
    setFormData((prev) => ({
      ...prev,
      city: parts[0] || "",
      state: parts.length > 1 ? parts[1] : "",
      country: parts.length > 2 ? parts[2] : "",
    }));
  };

  return (
    <Card sx={{ maxWidth: 1200, mx: 'auto', my: 3, p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack spacing={3}>
        {user && (
          <HorizontalStack spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ width: 56, height: 56 }}>
              <UserAvatar width={56} height={56} username={user.username} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Create New Report
            </Typography>
          </HorizontalStack>
        )}

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 3,
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
            }
          }}
        >
          <Tab
            value="manual"
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Article fontSize="small" />
                <span>Manual Report</span>
              </Stack>
            }
            sx={{ py: 2, textTransform: 'none', fontSize: '0.875rem' }}
          />
          <Tab
            value="ai"
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <SmartToy fontSize="small" />
                <span>AI-Assisted</span>
              </Stack>
            }
            sx={{ py: 2, textTransform: 'none', fontSize: '0.875rem' }}
          />
        </Tabs>

        {activeTab === "ai" && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              border: `1px dashed ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <SmartToy
              sx={{
                fontSize: 64,
                color: theme.palette.primary.main,
                mb: 2,
              }}
            />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Let AI Help Create Your Report
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
            >
              Provide a URL to a news article or webpage, and our AI will analyze the
              content to generate a draft report with key details.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleOpenAiDialog}
              startIcon={<SmartToy />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Generate with AI
            </Button>
          </Paper>
        )}

        {activeTab === "manual" && (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Title Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Title color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Report Title
                      </Typography>
                    </Stack>
                    <TextField
                      fullWidth
                      label="Enter a descriptive title"
                      required
                      name="title"
                      onChange={handleChange}
                      value={formData.title}
                      error={Boolean(errors.title)}
                      helperText={errors.title || "Keep it concise and descriptive (max 80 chars)"}
                      variant="outlined"
                      size="medium"
                    />

                    {titleSuggestions.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Suggested Titles:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                          {titleSuggestions.map((suggestion, index) => (
                            <Chip
                              key={index}
                              label={suggestion}
                              onClick={() => applyTitleSuggestion(suggestion)}
                              size="small"
                              clickable
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Content Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Description color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Report Details
                      </Typography>
                    </Stack>
                    <TextField
                      fullWidth
                      multiline
                      minRows={6}
                      maxRows={12}
                      name="content"
                      value={formData.content}
                      onChange={handleContentChange}
                      placeholder="Provide detailed information about the incident..."
                      error={Boolean(errors.content)}
                      helperText={errors.content || "Be as detailed as possible"}
                      variant="outlined"
                      size="medium"
                    />

                    {contentSuggestions.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Suggested Content:
                        </Typography>
                        <Stack spacing={1}>
                          {contentSuggestions.map((suggestion, index) => (
                            <Paper
                              key={index}
                              elevation={0}
                              sx={{
                                p: 2,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                cursor: "pointer",
                                transition: 'background-color 0.2s',
                                '&:hover': {
                                  backgroundColor: theme.palette.action.hover,
                                },
                              }}
                              onClick={() => applyContentSuggestion(suggestion)}
                            >
                              <Typography variant="body2">{suggestion}</Typography>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Location Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LocationOn color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Incident Location
                      </Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Country"
                          required
                          name="country"
                          onChange={handleChange}
                          value={formData.country}
                          error={Boolean(errors.country)}
                          helperText={errors.country}
                          variant="outlined"
                          size="medium"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="State/Province"
                          name="state"
                          onChange={handleChange}
                          value={formData.state}
                          error={Boolean(errors.state)}
                          helperText={errors.state}
                          variant="outlined"
                          size="medium"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="City"
                          name="city"
                          onChange={handleChange}
                          value={formData.city}
                          error={Boolean(errors.city)}
                          helperText={errors.city}
                          variant="outlined"
                          size="medium"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Area/Neighborhood"
                          name="area"
                          onChange={handleChange}
                          value={formData.area}
                          error={Boolean(errors.area)}
                          helperText={errors.area}
                          variant="outlined"
                          size="medium"
                        />
                      </Grid>
                    </Grid>

                    {locationSuggestions.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Suggested Locations:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                          {locationSuggestions.map((suggestion, index) => (
                            <Chip
                              key={index}
                              label={suggestion}
                              onClick={() => applyLocationSuggestion(suggestion)}
                              size="small"
                              clickable
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Media Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      <CloudUpload color="primary" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Upload Evidence
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add photos, videos, or audio recordings to support your report (max 3 files, 20MB each)
                    </Typography>

                    {formData.mediaError && (
                      <Typography variant="body2" color="error" gutterBottom>
                        {formData.mediaError}
                      </Typography>
                    )}

                    <Box
                      {...getRootProps()}
                      sx={{
                        border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        p: 4,
                        textAlign: "center",
                        cursor: "pointer",
                        backgroundColor: isDragActive
                          ? theme.palette.action.hover
                          : theme.palette.background.default,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <input {...getInputProps()} />
                      <CloudUpload
                        sx={{
                          fontSize: 48,
                          color: isDragActive
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                          mb: 1,
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          color: isDragActive
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                          fontWeight: 500,
                        }}
                      >
                        {isDragActive
                          ? "Drop files here"
                          : "Drag & drop files here, or click to browse"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supports images, videos, and audio files
                      </Typography>
                    </Box>

                    {formData.mediaPreviews.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Selected Files ({formData.mediaPreviews.length}/3):
                        </Typography>
                        <Grid container spacing={2}>
                          {formData.mediaPreviews.map((media, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                              <Box
                                sx={{
                                  position: "relative",
                                  borderRadius: 2,
                                  overflow: "hidden",
                                  border: `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                {media.type === "image" && (
                                  <img
                                    src={media.previewUrl}
                                    alt="Preview"
                                    style={{
                                      width: "100%",
                                      height: 200,
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                )}
                                {media.type === "video" && (
                                  <video
                                    controls
                                    style={{
                                      width: "100%",
                                      height: 200,
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  >
                                    <source src={media.previewUrl} />
                                  </video>
                                )}
                                {media.type === "audio" && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: 200,
                                      bgcolor: theme.palette.grey[100],
                                    }}
                                  >
                                    <audio controls style={{ width: "90%" }}>
                                      <source src={media.previewUrl} />
                                    </audio>
                                  </Box>
                                )}
                                <IconButton
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: theme.palette.error.main,
                                    color: "white",
                                    '&:hover': {
                                      backgroundColor: theme.palette.error.dark,
                                    },
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMedia(index);
                                  }}
                                >
                                  <Close fontSize="small" />
                                </IconButton>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {loading && (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Upload Progress:
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ width: "100%", mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {uploadProgress}%
                          </Typography>
                        </Box>
                        {uploadComplete && (
                          <Typography
                            variant="body2"
                            color="success.main"
                            sx={{ mt: 1, fontWeight: 500 }}
                          >
                            Upload complete!
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Submit Section */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      borderRadius: 2,
                      textTransform: 'none',
                    }}
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    sx={{
                      px: 4,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {loading ? "Publishing..." : "Publish Report"}
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {serverError && (
              <Box sx={{ mt: 3 }}>
                <ErrorAlert message={serverError} />
              </Box>
            )}
          </Box>
        )}
      </Stack>

      {/* AI Dialog */}
      <Dialog
        open={aiDialogOpen}
        onClose={handleCloseAiDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <SmartToy color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI-Assisted Report Creation
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={3}>
            <Typography>
              Enter the URL of a news article, blog post, or official report about the incident.
              Our AI will analyze the content and extract key details to create a draft report.
            </Typography>

            <TextField
              fullWidth
              label="Enter URL"
              variant="outlined"
              placeholder="https://example.com/news/incident-report"
              value={aiUrl}
              onChange={(e) => setAiUrl(e.target.value)}
              disabled={aiProcessing}
              InputProps={{
                startAdornment: (
                  <Link color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

            {aiError && <ErrorAlert message={aiError} />}

            {aiProcessing && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
                  Analyzing Content with AI...
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Processing with NVIDIA AI models. This may take a moment.
                </Typography>
                
                {streamedContent && (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 3,
                      p: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      maxHeight: 300,
                      overflowY: "auto",
                      textAlign: "left",
                      backgroundColor: theme.palette.background.default,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      AI Response:
                    </Typography>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ whiteSpace: "pre-wrap", fontFamily: 'inherit' }}
                    >
                      {streamedContent}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {extractedMetadata && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  AI Analysis Results
                </Typography>

                <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Title fontSize="small" color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Extracted Title
                    </Typography>
                  </Stack>
                  <Typography sx={{ mb: 1 }}>{extractedMetadata.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {(extractedMetadata.confidenceScores.title * 100).toFixed(0)}%
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Description fontSize="small" color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Extracted Content
                    </Typography>
                  </Stack>
                  <Typography sx={{ mb: 1 }}>{extractedMetadata.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {(extractedMetadata.confidenceScores.content * 100).toFixed(0)}%
                  </Typography>
                </Paper>

                {extractedMetadata.location && (
                  <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <LocationOn fontSize="small" color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Extracted Location
                      </Typography>
                    </Stack>
                    <Typography sx={{ mb: 1 }}>
                      {[
                        extractedMetadata.location.area,
                        extractedMetadata.location.city,
                        extractedMetadata.location.state,
                        extractedMetadata.location.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Confidence: {(extractedMetadata.confidenceScores.location * 100).toFixed(0)}%
                    </Typography>
                  </Paper>
                )}

                <Typography variant="caption" color="text.secondary">
                  Source: {extractedMetadata.source}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
          {!extractedMetadata ? (
            <>
              <Button
                onClick={handleCloseAiDialog}
                disabled={aiProcessing}
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAiProcess}
                variant="contained"
                disabled={aiProcessing || !aiUrl}
                startIcon={aiProcessing ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                {aiProcessing ? "Analyzing..." : "Analyze with AI"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCloseAiDialog}
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setExtractedMetadata(null)}
                variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                Try Another URL
              </Button>
              <Button
                onClick={applyAiSuggestions}
                variant="contained"
                color="primary"
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                Use This Draft
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={draftSaved}
        autoHideDuration={2000}
        message={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Save fontSize="small" />
            <span>Draft autosaved</span>
          </Stack>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{
          '& .MuiSnackbarContent-root': {
            borderRadius: 2,
          },
        }}
      />
    </Card>
  );
};

export default PostEditor;