if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((_) => {});
  });
}

function onRegisterBtnClicked() {
  var mod = document.querySelector("ons-modal");
  mod.show();
  setTimeout(function () {
    const navigator = document.getElementById("myNavigator");
    navigator.pushPage("pages/home.html");
    mod.hide();
  }, 1500);
}

function onHomeBtnClicked() {
  const navigator = document.getElementById("myNavigator");
  navigator.pushPage("pages/detail.html");
}
