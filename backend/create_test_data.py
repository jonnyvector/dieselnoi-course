"""
Script to create test data for the Dieselnoi platform
"""
from core.models import Course, Lesson

# Create Beginner Course
beginner_course = Course.objects.create(
    title="Fundamentals of Muay Thai",
    description="Master the essential techniques of authentic Muay Thai. Learn proper stance, basic strikes, and fundamental movements from legendary fighter Dieselnoi.",
    difficulty="beginner",
    price=29.99,
    thumbnail_url="https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800",
    is_published=True
)

# Create lessons for beginner course
Lesson.objects.create(
    course=beginner_course,
    title="Introduction to Muay Thai",
    description="Learn about the history and philosophy of Muay Thai",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=10,
    order=1,
    is_free_preview=True
)

Lesson.objects.create(
    course=beginner_course,
    title="Basic Stance and Footwork",
    description="Master the foundational stance and movement patterns",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=15,
    order=2,
    is_free_preview=False
)

Lesson.objects.create(
    course=beginner_course,
    title="Jab and Cross Technique",
    description="Learn proper form for the basic punching techniques",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=20,
    order=3,
    is_free_preview=False
)

# Create Intermediate Course
intermediate_course = Course.objects.create(
    title="Advanced Striking & Combinations",
    description="Develop devastating combinations and advanced striking techniques. Learn the secrets behind Dieselnoi's legendary knee strikes and clinch work.",
    difficulty="intermediate",
    price=49.99,
    thumbnail_url="https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800",
    is_published=True
)

# Create lessons for intermediate course
Lesson.objects.create(
    course=intermediate_course,
    title="Power Knee Techniques",
    description="Master the devastating knee strikes that made Dieselnoi famous",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=25,
    order=1,
    is_free_preview=True
)

Lesson.objects.create(
    course=intermediate_course,
    title="Clinch Control & Domination",
    description="Learn how to control your opponent in the clinch",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=30,
    order=2,
    is_free_preview=False
)

# Create Advanced Course
advanced_course = Course.objects.create(
    title="Elite Fighting Strategy",
    description="Master the mental game and strategic approach that dominated the Golden Era. Learn fight IQ, ring generalship, and advanced tactics.",
    difficulty="advanced",
    price=79.99,
    thumbnail_url="https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800",
    is_published=True
)

# Create lessons for advanced course
Lesson.objects.create(
    course=advanced_course,
    title="Reading Your Opponent",
    description="Develop the fight IQ to anticipate and counter",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=35,
    order=1,
    is_free_preview=True
)

Lesson.objects.create(
    course=advanced_course,
    title="Ring Control & Pressure",
    description="Master the art of controlling the pace and space",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=40,
    order=2,
    is_free_preview=False
)

Lesson.objects.create(
    course=advanced_course,
    title="Championship Mindset",
    description="Develop the mental fortitude of a champion",
    video_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    duration_minutes=30,
    order=3,
    is_free_preview=False
)

print("✅ Test data created successfully!")
print(f"Created {Course.objects.count()} courses")
print(f"Created {Lesson.objects.count()} lessons")
