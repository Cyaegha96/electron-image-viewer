const loadBtn = document.getElementById('loadBtn');
const modal = document.getElementById('modal');
const refreshMoveBtn = document.getElementById('refreshMoveBtn');
const modalImg = document.getElementById('modalImg');
const copyBtn = document.getElementById('copyBtn');
const moveBtn = document.getElementById('moveBtn');
const deleteConfirmDialog = document.getElementById('deleteConfirmDialog');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const exploreBtn = document.getElementById('exploreBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const loadLast100Btn = document.getElementById('loadLast100Btn');
let currentFolder = null;
  
let imageToDelete = null; // 삭제할 이미지 경로 저장
let isLast100Only = false; // 체크박스 상태 기억
let targetFolder = 'F:/nai/Favorite';

let imagePaths = [];         // 폴더에서 불러온 이미지 경로들
let currentIndex = -1;       // 현재 모달에 보여지는 이미지 인덱스

// Paging

const grid = document.getElementById('grid');
const IMAGE_MARGIN = 10;
const ITEMS_PER_ROW = 5;
const VISIBLE_ROWS = 5;
const BUFFER_ROWS = 3;

shuffleBtn.addEventListener('click', () => {
  if (imagePaths.length > 0) {
    shuffleArray(imagePaths);
    setupVirtualScroll();
    showToast('이미지를 무작위로 섞었습니다!');
  }
});

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
loadLast100Btn.addEventListener('click', async () => {
  imagePaths = await window.electronAPI.selectLast100Images();
  isLast100Only=true
  setupVirtualScroll();
  showToast('최근 100장의 이미지를 불러왔습니다!');
});

function renderVirtualImages() {
  const gridWidth = grid.clientWidth;
  const imageWidth = Math.floor((gridWidth - (ITEMS_PER_ROW - 1) * IMAGE_MARGIN) / ITEMS_PER_ROW);
  const rowHeight = imageWidth + IMAGE_MARGIN; // 정사각형 이미지 기준

  const scrollTop = grid.scrollTop;
  const startRow = Math.floor(scrollTop / rowHeight) - BUFFER_ROWS;
  const endRow = startRow + VISIBLE_ROWS + BUFFER_ROWS * 2;

  const startIndex = Math.max(startRow * ITEMS_PER_ROW, 0);
  const endIndex = Math.min((endRow + 1) * ITEMS_PER_ROW, imagePaths.length);

  grid.querySelectorAll('img.thumb').forEach(img => img.remove());

  for (let i = startIndex; i < endIndex; i++) {
    const img = document.createElement('img');
    img.src = `file://${imagePaths[i]}`;
    img.className = 'thumb';

    img.style.position = 'absolute';
    img.style.width = `${imageWidth}px`;
    img.style.height = `${imageWidth}px`; // 정사각형
    img.style.left = `${(i % ITEMS_PER_ROW) * (imageWidth + IMAGE_MARGIN)}px`;
    img.style.top = `${Math.floor(i / ITEMS_PER_ROW) * rowHeight}px`;

    img.addEventListener('click', () => openModal(i));
    grid.appendChild(img);
  }
}

function setupVirtualScroll() {
  const gridWidth = grid.clientWidth;
  const imageWidth = Math.floor((gridWidth - (ITEMS_PER_ROW - 1) * IMAGE_MARGIN) / ITEMS_PER_ROW);
  const rowHeight = imageWidth + IMAGE_MARGIN;
  const totalRows = Math.ceil(imagePaths.length / ITEMS_PER_ROW);
  const totalHeight = totalRows * rowHeight;

  grid.style.position = 'relative';
  grid.style.overflowY = 'auto';
  grid.style.height = `${VISIBLE_ROWS * rowHeight}px`;

  const oldSpacer = grid.querySelector('.spacer');
  if (oldSpacer) oldSpacer.remove();

  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  spacer.style.height = `${totalHeight}px`;
  spacer.style.position = 'absolute';
  spacer.style.top = '0';
  spacer.style.left = '0';
  spacer.style.right = '0';
  grid.appendChild(spacer);

  grid.addEventListener('scroll', renderVirtualImages);
  renderVirtualImages();
}


// 폴더 선택 후 썸네일 생성
loadBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.selectFolder();
  isLast100Only= false;
  if (Array.isArray(result) && result.length > 0) {
    imagePaths = result;
    currentFolder = result[0] ? result[0].substring(0, result[0].lastIndexOf('\\')) : null;
    setupVirtualScroll();
  }
});

// 모달 열기 함수
function openModal(index) {
    currentIndex = index;
    modalImg.src = `file://${imagePaths[currentIndex]}`;
    
    // 파일 경로 표시
    const filePath = imagePaths[currentIndex];
    const filePathElement = document.getElementById('filePath');
    filePathElement.textContent = filePath; // 파일 경로를 텍스트로 표시
    openImageModal(modalImg.src);
    modal.style.display = 'flex';
}

// 닫기 버튼 클릭 시 모달 닫기
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  function closeModal() {
    modal.style.display = 'none';
    const metadata = null;
    const textData = null;
  }

document.addEventListener('keydown', (e) => {
    if (modal.style.display !== 'flex') return;
  
    switch (e.key) {
      case 'Escape':
        closeModal();
        break;
  
      case 'ArrowRight':
        if (currentIndex < imagePaths.length - 1) {
          openModal(currentIndex + 1);
        }
        break;
  
      case 'ArrowLeft':
        if (currentIndex > 0) {
          openModal(currentIndex - 1);
        }
        break;
  
        default:
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          // 텍스트가 선택된 상태면 그것을 클립보드에 복사
          const selectedText = selection.toString();
          navigator.clipboard.writeText(selectedText)
            .then(() => showToast('텍스트가 클립보드에 복사되었습니다!'))
            .catch(err => console.error('텍스트 복사 실패:', err));
        } else if (currentIndex !== -1) {
          // 아니면 이미지 복사
          window.electronAPI.copyImageToClipboard2(imagePaths[currentIndex]);
          showToast('이미지가 클립보드에 복사되었습니다!');
        }
      }
      break;
    }
  });
  

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    // 3초 뒤에 사라지도록
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  copyBtn.addEventListener('click', () => {
    if (currentIndex !== -1) {
      window.electronAPI.copyImageToClipboard2(imagePaths[currentIndex]);
      showToast('이미지가 클립보드에 복사되었습니다!');
    }
  });
  
  const deleteBtn = document.getElementById('deleteBtn');

  deleteBtn.addEventListener('click', () => {
    if (currentIndex !== -1) {
      // 모달을 닫지 않고, 삭제 확인 다이얼로그만 표시
      imageToDelete = imagePaths[currentIndex];
      deleteConfirmDialog.style.display = 'flex';  // 삭제 확인 다이얼로그 표시
      setTimeout(() => {
        deleteConfirmDialog.classList.add('show');  // 애니메이션 효과
      }, 10);
    }
  });
  
  confirmDeleteBtn.addEventListener('click', () => {
    const uriTest =decodeURIComponent(new URL(imageToDelete).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
    window.electronAPI.deleteImage(uriTest)
      .then(() => {
        const deletedIndex = imagePaths.indexOf(imageToDelete);
        if (deletedIndex > -1) {
          imagePaths.splice(deletedIndex, 1);
  
          // 다음 또는 이전 이미지 보여주기
          if (imagePaths.length === 0) {
            closeModal();
          } else {
            if (deletedIndex >= imagePaths.length) {
              currentIndex = imagePaths.length - 1;
            } else {
              currentIndex = deletedIndex;
            }
            openModal(currentIndex);
          }
          closeModal();

          setTimeout(() => {
            deleteConfirmDialog.style.display = 'none';
            setupVirtualScroll();  // 여기를 약간 딜레이
            showToast('이미지가 삭제되었습니다.');
          }, 50);
        }
  
        deleteConfirmDialog.style.display = 'none';
      })
      .catch(err => {
        console.error('삭제 오류:', err);
        showToast('이미지를 삭제하지 못했습니다.');
      });
  });


  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      const img = entry.target;
      if (entry.isIntersecting) {
        if (img.dataset.src && !img.src) {
          img.src = img.dataset.src;
        }
      } else {
        // 뷰포트에서 벗어나면 src 비워서 GPU/메모리 절약
        img.src = '';
      }
    });
  }, {
    rootMargin: '400px',
    threshold: 0.1
  });
  function observeLazyImages() {
    document.querySelectorAll('img.lazy').forEach(img => {
      observer.observe(img);
    });
  }
  

  function hideDeleteDialog() {
    deleteConfirmDialog.classList.remove('show');
    deleteConfirmDialog.classList.add('hide');
    setTimeout(() => {
      deleteConfirmDialog.style.display = 'none';
      deleteConfirmDialog.classList.remove('hide');
    }, 200);
  }
  
  cancelDeleteBtn.addEventListener('click', hideDeleteDialog);

  exploreBtn.addEventListener('click', () => {
    if (currentIndex !== -1) {
      const filePath = imagePaths[currentIndex];
      const normalizedPath = decodeURIComponent(new URL(filePath).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
      console.log(normalizedPath);
      window.electronAPI.openExplorer(normalizedPath);
    }
  });

  async function openImageModal(filePath) {
  
    const metadata = await window.electronAPI.parsePngMetadata(filePath);
    renderMetadata(JSON.parse(metadata));
    }
  function renderMetadata(meta) {
    const container = document.getElementById('metadataContainer');
    container.innerHTML = ''; // 초기화
  
    const title = document.createElement('h3');
    title.textContent = '📄 전체 프롬프트';
    container.appendChild(title);
  
    const promptBlock = document.createElement('div');
    promptBlock.className = 'prompt-box';
    promptBlock.innerHTML = `
   <p><strong>Prompt:</strong></p>
  <code>${meta.prompt}</code>
  <p><strong>Negative Prompt:</strong></p>
  <code>${meta.negative_prompt}</code>
  `;
container.appendChild(promptBlock);
  
    const info = document.createElement('p');
    info.textContent = `Size: ${meta.width}x${meta.height}, Sampler: ${meta.sampler}, Steps: ${meta.steps}`;
    container.appendChild(info);
  
    if (meta.characterPrompts && meta.characterPrompts.length > 0) {
      const charTitle = document.createElement('h3');
      charTitle.textContent = '👩 캐릭터 프롬프트';
      container.appendChild(charTitle);
  
      meta.characterPrompts.forEach((char, idx) => {
        const charDiv = document.createElement('div');
        charDiv.style.border = '1px solid #ccc';
        charDiv.style.margin = '10px';
        charDiv.style.padding = '8px';
        charDiv.innerHTML = `
          <strong>#${idx + 1}</strong><br>
          Prompt: ${char.prompt}<br>
          Negative: ${char.negative_prompt || '(없음)'}<br>
          Position: [${char.position?.[0] ?? '-'}, ${char.position?.[1] ?? '-'}]
        `;
        container.appendChild(charDiv);
      });
    }
  }

  refreshMoveBtn.addEventListener('click', async () => {
   
    // Electron에서 사용자에게 대상 폴더를 선택하도록 요청
    targetFolder = await window.electronAPI.selectTargetFolder();
    if (!targetFolder) {
      showToast('이동이 취소되었습니다.');
      return;
    }else{
      showToast('즐겨찾기 폴더가 변경되었습니다.');
      return;
    }
  
  });


  moveBtn.addEventListener('click', async () => {
    if (currentIndex === -1) return;
  
    const currentPath = decodeURIComponent(new URL(imagePaths[currentIndex]).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
  
  
    const result = await window.electronAPI.moveImage(currentPath, targetFolder);
    if (result.success) {
      const movedIndex = imagePaths.indexOf(imagePaths[currentIndex]);
      imagePaths.splice(movedIndex, 1);
  
      if (imagePaths.length === 0) {
        closeModal();
      } else {
        currentIndex = Math.min(movedIndex, imagePaths.length - 1);
        openModal(currentIndex);
      }
  
      setupVirtualScroll(); // 리스트 다시 그림
      showToast('이미지가 이동되었습니다!');
    } else {
      showToast('이동 실패: ' + result.error);
      console.error(result.error);
    }
  });