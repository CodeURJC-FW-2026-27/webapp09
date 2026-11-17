document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
    input.addEventListener('change', () => {
        const preview = document.querySelector('.image-preview');
        const file = input.files && input.files[0];
        if (!preview || !file) return;
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
    });
});
