const image = document.getElementById("profileImage");
const input = document.getElementById("fileInput");

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        image.src = URL.createObjectURL(file);
    }
});

const profilePageBtn = document.getElementById("openProfilePageBtn");
const profilePage = document.getElementById("profilePage");

profilePageBtn.addEventListener("click", function () {
    profilePage.classList.add("active");
});