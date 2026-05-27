import { createClient } from '@/lib/supabase/client'

export async function uploadLessonImage(file, subtopicId, sectionIndex) {
  const supabase = createClient()

  // Validate
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { error: 'Image must be under 5MB' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPG, PNG, WebP, or GIF images are allowed' }
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${subtopicId}/section-${sectionIndex}-${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('lesson-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('lesson-images')
    .getPublicUrl(filename)

  return { url: publicUrl }
}

export async function deleteLessonImage(imageUrl) {
  const supabase = createClient()

  // Extract path from URL
  const urlParts = imageUrl.split('/lesson-images/')
  if (urlParts.length < 2) return

  const path = urlParts[1]
  await supabase.storage.from('lesson-images').remove([path])
}